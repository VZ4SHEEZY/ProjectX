import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save, X } from 'lucide-react';
import { userAPI } from '../services/api';

interface ProfileBuilderProps {
  userId: string;
  currentLayout?: any;
  onSave: (layout: any) => void;
  onCancel: () => void;
}

const DraggableWidget: React.FC<{ id: string; name: string; onRemove?: () => void; zone?: string }> = ({ id, name, onRemove, zone }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id,
    data: { zone }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-900 border border-gray-700 p-4 rounded flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing hover:border-[#39FF14]/50 transition-colors"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3 flex-1">
        <GripVertical size={18} className="text-gray-500 flex-shrink-0" />
        <span className="text-white font-mono text-sm">{name}</span>
      </div>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-500 hover:text-red-400 transition-colors text-xs font-bold flex-shrink-0"
        >
          ✕ HIDE
        </button>
      )}
    </div>
  );
};

const ProfileBuilder: React.FC<ProfileBuilderProps> = ({ userId, currentLayout, onSave, onCancel }) => {
  const [leftZone, setLeftZone] = useState<string[]>(currentLayout?.leftZone || ['music', 'topfriends']);
  const [rightZone, setRightZone] = useState<string[]>(currentLayout?.rightZone || ['assets', 'socialhub']);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { distance: 8 }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const availableWidgets = [
    { id: 'music', name: 'Music Player' },
    { id: 'topfriends', name: 'Top Friends' },
    { id: 'geonode', name: 'GeoNode' },
    { id: 'assets', name: 'NFT Gallery' },
    { id: 'socialhub', name: 'Social Hub' },
    { id: 'datalog', name: 'Data Log' },
    { id: 'customcode', name: 'Custom Code' },
    { id: 'checkins', name: 'Checkins' },
    { id: 'trophies', name: 'Trophies' },
  ];

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    const activeZone = active.data.current?.zone;
    const overZone = over.data.current?.zone;

    // Cross-zone drag: left → right
    if (activeZone === 'left' && overZone === 'right') {
      setLeftZone(leftZone.filter(id => id !== activeId));
      const newIndex = rightZone.indexOf(overId);
      const insertIndex = newIndex >= 0 ? newIndex : rightZone.length;
      setRightZone([...rightZone.slice(0, insertIndex), activeId, ...rightZone.slice(insertIndex)]);
    }
    // Cross-zone drag: right → left
    else if (activeZone === 'right' && overZone === 'left') {
      setRightZone(rightZone.filter(id => id !== activeId));
      const newIndex = leftZone.indexOf(overId);
      const insertIndex = newIndex >= 0 ? newIndex : leftZone.length;
      setLeftZone([...leftZone.slice(0, insertIndex), activeId, ...leftZone.slice(insertIndex)]);
    }
    // Reorder within left zone
    else if (activeZone === 'left' && overZone === 'left') {
      const oldIndex = leftZone.indexOf(activeId);
      const newIndex = leftZone.indexOf(overId);
      if (oldIndex !== newIndex && oldIndex >= 0 && newIndex >= 0) {
        setLeftZone(arrayMove(leftZone, oldIndex, newIndex));
      }
    }
    // Reorder within right zone
    else if (activeZone === 'right' && overZone === 'right') {
      const oldIndex = rightZone.indexOf(activeId);
      const newIndex = rightZone.indexOf(overId);
      if (oldIndex !== newIndex && oldIndex >= 0 && newIndex >= 0) {
        setRightZone(arrayMove(rightZone, oldIndex, newIndex));
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const layout = {
        leftZone,
        rightZone,
        bottomZone: ['posts'], // Posts grid always locked in bottom
        hiddenWidgets: [],
        mobileOrder: [...leftZone, 'posts', ...rightZone],
      };

      // Save layout to backend
      await userAPI.updateProfile({ profileLayout: layout });
      onSave(layout);
      alert('Profile layout saved!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save layout');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-black/80 border-2 border-[#39FF14] rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[#39FF14] font-bold text-xl">CUSTOMIZE PROFILE</h2>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-[#39FF14] text-black font-bold rounded hover:bg-[#39FF14]/80 disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'SAVING...' : 'SAVE LAYOUT'}
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-400 font-bold rounded hover:border-red-500 hover:text-red-500"
          >
            <X size={16} />
            CANCEL
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-6">
          {/* Left Zone */}
          <div className="bg-gray-950 border-2 border-dashed border-gray-700 p-4 rounded min-h-96">
            <h3 className="text-white font-bold mb-4">LEFT COLUMN</h3>
            <SortableContext items={leftZone} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {leftZone.map((widgetId) => {
                  const widget = availableWidgets.find((w) => w.id === widgetId);
                  return widget ? (
                    <DraggableWidget 
                      key={widgetId} 
                      id={widgetId} 
                      name={widget.name}
                      zone="left"
                      onRemove={() => setLeftZone(leftZone.filter(id => id !== widgetId))}
                    />
                  ) : null;
                })}
              </div>
            </SortableContext>
          </div>

          {/* Right Zone */}
          <div className="bg-gray-950 border-2 border-dashed border-gray-700 p-4 rounded min-h-96">
            <h3 className="text-white font-bold mb-4">RIGHT COLUMN</h3>
            <SortableContext items={rightZone} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {rightZone.map((widgetId) => {
                  const widget = availableWidgets.find((w) => w.id === widgetId);
                  return widget ? (
                    <DraggableWidget 
                      key={widgetId} 
                      id={widgetId} 
                      name={widget.name}
                      zone="right"
                      onRemove={() => setRightZone(rightZone.filter(id => id !== widgetId))}
                    />
                  ) : null;
                })}
              </div>
            </SortableContext>
          </div>
        </div>
      </DndContext>

      {/* Available Widgets Section */}
      <div className="mt-6 bg-gray-950 border-2 border-dashed border-gray-700 p-4 rounded">
        <h3 className="text-white font-bold mb-4">AVAILABLE WIDGETS (Click to Add)</h3>
        <div className="grid grid-cols-2 gap-2">
          {availableWidgets
            .filter(w => !leftZone.includes(w.id) && !rightZone.includes(w.id))
            .map(widget => (
              <button
                key={widget.id}
                onClick={() => setLeftZone([...leftZone, widget.id])}
                className="bg-gray-900 border border-gray-700 p-3 rounded text-left hover:border-[#39FF14] hover:bg-gray-800 transition-all text-white font-mono text-sm"
              >
                + {widget.name}
              </button>
            ))}
        </div>
      </div>

      <div className="mt-6 bg-gray-950 border-2 border-dashed border-gray-700 p-4 rounded">
        <h3 className="text-white font-bold mb-2">BOTTOM SECTION (Locked)</h3>
        <p className="text-gray-400 text-sm">📌 Posts Grid is always here</p>
      </div>

      <div className="mt-4 text-xs text-gray-500 font-mono space-y-1">
        <p>💡 Drag widgets between columns to move them</p>
        <p>💡 Click ✕ HIDE to remove a widget</p>
        <p>💡 Click + to add hidden widgets back</p>
        <p>💡 Mobile will stack all widgets vertically</p>
      </div>
    </div>
  );
};

export default ProfileBuilder;
