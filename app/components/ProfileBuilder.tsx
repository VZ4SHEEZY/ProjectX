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

const DraggableWidget: React.FC<{ id: string; name: string }> = ({ id, name }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-900 border border-gray-700 p-4 rounded flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-[#39FF14]/50 transition-colors"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={18} className="text-gray-500" />
      <span className="text-white font-mono text-sm">{name}</span>
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
    if (!over || active.id === over.id) return;

    // Determine which zone the items belong to
    if (active.data.current?.zone === 'left') {
      const oldIndex = leftZone.indexOf(active.id);
      const newIndex = leftZone.indexOf(over.id);
      setLeftZone(arrayMove(leftZone, oldIndex, newIndex));
    } else if (active.data.current?.zone === 'right') {
      const oldIndex = rightZone.indexOf(active.id);
      const newIndex = rightZone.indexOf(over.id);
      setRightZone(arrayMove(rightZone, oldIndex, newIndex));
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

      <div className="grid grid-cols-2 gap-6">
        {/* Left Zone */}
        <div className="bg-gray-950 border-2 border-dashed border-gray-700 p-4 rounded">
          <h3 className="text-white font-bold mb-4">LEFT COLUMN</h3>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={leftZone} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {leftZone.map((widgetId) => {
                  const widget = availableWidgets.find((w) => w.id === widgetId);
                  return widget ? (
                    <DraggableWidget key={widgetId} id={widgetId} name={widget.name} />
                  ) : null;
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right Zone */}
        <div className="bg-gray-950 border-2 border-dashed border-gray-700 p-4 rounded">
          <h3 className="text-white font-bold mb-4">RIGHT COLUMN</h3>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rightZone} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {rightZone.map((widgetId) => {
                  const widget = availableWidgets.find((w) => w.id === widgetId);
                  return widget ? (
                    <DraggableWidget key={widgetId} id={widgetId} name={widget.name} />
                  ) : null;
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <div className="mt-6 bg-gray-950 border-2 border-dashed border-gray-700 p-4 rounded">
        <h3 className="text-white font-bold mb-2">BOTTOM SECTION (Locked)</h3>
        <p className="text-gray-400 text-sm">📌 Posts Grid is always here</p>
      </div>

      <div className="mt-4 text-xs text-gray-500 font-mono">
        💡 Drag widgets to reorder. Save when done. Mobile will stack vertically.
      </div>
    </div>
  );
};

export default ProfileBuilder;
