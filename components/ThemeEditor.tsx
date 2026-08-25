import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  Eye,
  GripVertical,
  LockKeyhole,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { profileAPI } from "../services/api";
import { PROFILE_MODULE_REGISTRY, ProfileV2Module } from "./ProfileV2Modules";
import ProfileV2Modules from "./ProfileV2Modules";
import TopFriendsEditor from "./TopFriendsEditor";
import RelationshipManager from "./RelationshipManager";
import {
  FactionInfluence,
  ProfileThemeTokens,
  factionVisualClass,
  getFactionStarterTheme,
  profileThemeStyle,
  resolveProfileTheme,
} from "../profileV2Themes";

interface ThemeEditorProps {
  isOpen: boolean;
  onClose: () => void;
}
type RuleNode =
  | { op: "predicate"; type: string; creatorTierId?: string }
  | { op: "and" | "or"; children: RuleNode[] };
interface Rule {
  _id?: string;
  id?: string;
  name: string;
  expression: RuleNode;
  presentation: "hidden" | "locked_preview";
  enabled: boolean;
}

const predicateOptions = [
  ["everyone", "Public"],
  ["authenticated", "CyberDope users"],
  ["followers", "Followers"],
  ["friends", "Friends"],
  ["same_faction", "Same faction"],
  ["age_verified", "Age verified"],
  ["subscribers", "Subscriber (coming later)"],
  ["creator_tier", "Membership tier (coming later)"],
  ["owner", "Only me"],
];
const defaultRule: Rule = {
  name: "Friends only",
  expression: { op: "predicate", type: "friends" },
  presentation: "locked_preview",
  enabled: true,
};
const designControlLabels:Record<string,string>={fontFamily:'Typography',layoutStyle:'Layout',spacing:'Spacing',borderStyle:'Frame',borderRadius:'Corners',effectIntensity:'Effect intensity'};
const designValueLabels:Record<string,string>={mono:'Mono',sans:'Modern Sans',serif:'Editorial Serif',display:'Display','single':'Single Column','sidebar-left':'Left Sidebar','sidebar-right':'Right Sidebar','masonry':'Gallery Grid',compact:'Compact',comfortable:'Comfortable',spacious:'Spacious',minimal:'Minimal',solid:'Solid',double:'Double Line',glow:'Glow',none:'None',small:'Subtle',medium:'Medium',large:'Round',off:'Off',low:'Low'};
const effectLabels:Record<string,string>={animations:'Motion',glowEffects:'Glow',scanlines:'Scanlines'};

const SortableModule = ({ module, onToggle, onRemove, onRule, onConfig, rules }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module._id });
  const entry = PROFILE_MODULE_REGISTRY[module.type];
  const textField = (key: string, label: string, maxLength: number) => (
    <label className="block mt-2 text-[10px] text-gray-500">
      {label}
      <input value={module.config?.[key] || ""} maxLength={maxLength} onChange={(event) => onConfig(module._id, key, event.target.value)} className="mt-1 w-full bg-gray-950 border border-gray-800 text-xs text-gray-200 p-2 rounded" />
    </label>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`p-3 border border-gray-800 bg-black/70 rounded-lg ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <button
          aria-label={`Reorder ${entry?.label}`}
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-500"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1">
          <p className="text-white text-sm font-bold">
            {entry?.label || module.type}
          </p>
          <p className="text-[10px] text-gray-500">{entry?.description}</p>
        </div>
        <button
          onClick={() => onToggle(module._id)}
          className={`text-[10px] px-2 py-1 border rounded ${module.enabled ? "text-green-300 border-green-800" : "text-gray-500 border-gray-800"}`}
        >
          {module.enabled ? "VISIBLE" : "HIDDEN"}
        </button>
        <button
          aria-label="Remove module"
          onClick={() => onRemove(module._id)}
          className="text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {module.type === "identity" && textField("tagline", "Hero tagline", 120)}
      {module.type === "bio" && textField("text", "About text", 500)}
      {module.type === "media" && <label className="block mt-2 text-[10px] text-gray-500">Gallery items<input type="number" min="1" max="12" value={module.config?.limit || 6} onChange={(event) => onConfig(module._id, "limit", Number(event.target.value))} className="mt-1 w-full bg-gray-950 border border-gray-800 text-xs text-gray-200 p-2 rounded" /></label>}
      {module.type === "creator_summary" && <>{textField("heading", "Creator heading", 100)}{textField("description", "Creator description", 300)}</>}
      <select
        aria-label={`Access rule for ${entry?.label}`}
        value={module.accessRuleId || ""}
        onChange={(e) => onRule(module._id, e.target.value)}
        className="mt-2 w-full bg-gray-950 border border-gray-800 text-xs text-gray-300 p-2 rounded"
      >
        <option value="">Public / profile audience</option>
        {rules.map((rule: Rule) => (
          <option key={rule._id || rule.id} value={rule._id || rule.id}>
            {rule.name} ·{" "}
            {rule.presentation === "hidden" ? "Hidden" : "Locked preview"}
          </option>
        ))}
      </select>
    </div>
  );
};

const RuleEditor = ({ rule, onChange, onDelete }: any) => {
  const expression = rule.expression;
  const children =
    expression.op === "predicate" ? [expression] : expression.children;
  const setChild = (index: number, key: string, value: string) => {
    const next = children.map((item: RuleNode, i: number) =>
      i === index ? { ...item, [key]: value } : item,
    );
    onChange({
      ...rule,
      expression:
        next.length === 1
          ? next[0]
          : {
              op: expression.op === "predicate" ? "and" : expression.op,
              children: next,
            },
    });
  };
  return (
    <div className="border border-gray-800 rounded-lg p-3 space-y-3">
      <div className="flex gap-2">
        <input
          aria-label="Rule name"
          value={rule.name}
          maxLength={80}
          onChange={(e) => onChange({ ...rule, name: e.target.value })}
          className="flex-1 bg-black border border-gray-700 p-2 text-white text-sm rounded"
        />
        <button
          aria-label="Delete rule"
          onClick={onDelete}
          className="text-red-400"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="flex gap-2">
        <select
          aria-label="Rule operator"
          value={expression.op === "predicate" ? "single" : expression.op}
          onChange={(e) => {
            const op = e.target.value;
            if (op === "single") onChange({ ...rule, expression: children[0] });
            else
              onChange({
                ...rule,
                expression: {
                  op,
                  children:
                    children.length > 1
                      ? children
                      : [children[0], { op: "predicate", type: "friends" }],
                },
              });
          }}
          className="bg-black border border-gray-700 p-2 text-xs text-white rounded"
        >
          <option value="single">Single condition</option>
          <option value="and">All conditions (AND)</option>
          <option value="or">Any condition (OR)</option>
        </select>
        <select
          aria-label="Locked presentation"
          value={rule.presentation}
          onChange={(e) => onChange({ ...rule, presentation: e.target.value })}
          className="bg-black border border-gray-700 p-2 text-xs text-white rounded"
        >
          <option value="hidden">Hidden</option>
          <option value="locked_preview">Locked Preview</option>
        </select>
      </div>
      {children.map((child: RuleNode, index: number) => (
        <div key={index} className="flex gap-2">
          <select
            aria-label={`Condition ${index + 1}`}
            value={(child as any).type}
            onChange={(e) => setChild(index, "type", e.target.value)}
            className="flex-1 bg-gray-950 border border-gray-800 p-2 text-xs text-white rounded"
          >
            {predicateOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {children.length > 1 && (
            <button
              onClick={() => {
                const next = children.filter(
                  (_: any, i: number) => i !== index,
                );
                onChange({
                  ...rule,
                  expression:
                    next.length === 1
                      ? next[0]
                      : { ...expression, children: next },
                });
              }}
              className="text-gray-500"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {expression.op !== "predicate" && children.length < 8 && (
        <button
          onClick={() =>
            onChange({
              ...rule,
              expression: {
                ...expression,
                children: [...children, { op: "predicate", type: "friends" }],
              },
            })
          }
          className="text-xs text-cyan-300"
        >
          <Plus size={12} className="inline" /> Add condition
        </button>
      )}{" "}
      {children.some((child: any) =>
        ["subscribers", "creator_tier"].includes(child.type),
      ) && (
        <p className="text-[10px] text-amber-300">
          Subscription conditions are saved safely but fail closed until paid
          memberships launch.
        </p>
      )}
    </div>
  );
};

const ThemeEditor: React.FC<ThemeEditorProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [status, setStatus] = useState("");
  const [tab, setTab] = useState<
      "design" | "modules" | "access" | "friends" | "social"
    >("design"),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [profile, setProfile] = useState<any>({}),
    [owner, setOwner] = useState<any>({
      username: "you",
      faction: "Unaffiliated",
    }),
    [theme, setTheme] = useState<ProfileThemeTokens>(getFactionStarterTheme()),
    [influence, setInfluence] = useState<FactionInfluence>("full");
  const [modules, setModules] = useState<any[]>([]),
    [rules, setRules] = useState<Rule[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    profileAPI
      .getMine()
      .then((response) => {
        const data = response.data?.data || {};
        const p = data.profile || {};
        const faction = data.owner?.faction || p.faction || "Unaffiliated";
        setProfile(p);
        setOwner({
          ...data.owner,
          ...p,
          username: data.owner?.username || "you",
          faction,
        });
        setInfluence(data.layout?.factionStarterTheme || "full");
        setTheme({
          ...getFactionStarterTheme(faction),
          ...(data.layout?.theme || {}),
        });
        setModules(
          (data.modules || []).map((m: any) => ({
            ...m,
            _id: String(m._id),
            accessRuleId: m.accessRule ? String(m.accessRule) : "",
          })),
        );
        setRules(
          (data.accessRules || []).map((r: any) => ({
            ...r,
            id: String(r._id),
          })),
        );
      })
      .catch(() => setStatus("Could not load Profile V2."))
      .finally(() => setLoading(false));
  }, [isOpen]);
  const resolved = useMemo(
    () => resolveProfileTheme(owner.faction, influence, theme),
    [owner.faction, influence, theme],
  );
  const previewModules = modules
    .filter((m) => m.enabled)
    .map((m) => ({ ...m, config: m.config || {} }));
  const save = async () => {
    setSaving(true);
    setStatus("");
    try {
      const ruleResult = await profileAPI.saveAccessRules(
        rules.map((r) => ({
          id: r._id || (/^([a-f\d]{24})$/i.test(r.id || "") ? r.id : undefined),
          name: r.name,
          expression: r.expression,
          presentation: r.presentation,
          enabled: r.enabled,
        })),
      );
      const savedRules = ruleResult.data?.data || [];
      const named = new Map(
        savedRules.map((r: any) => [r.name, String(r._id)]),
      );
      const outgoing = modules.map((m, index) => ({
        type: m.type,
        position: index,
        enabled: m.enabled,
        config: m.config || {},
        accessRuleId: m.accessRuleId?.startsWith("new-")
          ? named.get(rules.find((r) => r.id === m.accessRuleId)?.name)
          : m.accessRuleId || null,
      }));
      await profileAPI.updateMine(
        {},
        { theme, factionStarterTheme: influence },
      );
      await profileAPI.saveModules(outgoing);
      setStatus("Profile published.");
      window.dispatchEvent(new Event("profileV2Updated"));
    } catch (error: any) {
      setStatus(error?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };
  const addModule = (type: string) =>
    setModules((current) => [
      ...current,
      {
        _id: `new-${crypto.randomUUID()}`,
        type,
        position: current.length,
        enabled: true,
        config: {},
        accessRuleId: "",
      },
    ]);
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col"
      data-testid="profile-v2-studio"
    >
      <header className="min-h-16 border-b border-gray-800 flex items-center px-3 md:px-4 py-2 gap-2 md:gap-3 profile-studio-header">
        <Palette className="text-[#39FF14]" />
        <div className="flex-1">
          <h1 className="text-white font-black">PROFILE STUDIO</h1>
          <p className="text-[10px] text-gray-500">
            Build a personal page—not a settings screen.
          </p>
        </div>
        <button
          onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}
          className="p-2 text-gray-300"
          aria-label="Switch preview device"
        >
          {device === "desktop" ? <Monitor /> : <Smartphone />}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-3 md:px-4 py-2 bg-[#39FF14] text-black font-bold text-xs rounded flex gap-2 whitespace-nowrap"
        >
          <Save size={14} />
          {saving ? "SAVING…" : "SAVE & PUBLISH"}
        </button>
        <button onClick={onClose} aria-label="Close">
          <X className="text-gray-400" />
        </button>
      </header>
      <div className="profile-studio-workspace flex-1 grid lg:grid-cols-[380px_1fr] overflow-hidden">
        <aside className="profile-studio-controls border-r border-gray-800 overflow-y-auto p-3 md:p-4">
          <nav className="sticky top-0 z-10 bg-black/95 grid grid-cols-5 gap-1 mb-5 pb-2">
            {(["design", "modules", "access", "friends", "social"] as const).map(
              (value) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={`text-[10px] uppercase py-2 rounded ${tab === value ? "bg-white text-black" : "bg-gray-900 text-gray-400"}`}
                >
                  {value}
                </button>
              ),
            )}
          </nav>
          {loading ? (
            <p className="text-gray-500">Loading normalized profile…</p>
          ) : (
            <>
              {tab === "design" && (
                <div className="space-y-5">
                  <fieldset>
                    <legend className="text-xs text-gray-400 mb-2">
                      Faction influence
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                      {(["full", "partial", "off"] as const).map((value) => (
                        <button
                          key={value}
                          onClick={() => setInfluence(value)}
                          className={`p-2 border text-xs uppercase rounded ${influence === value ? "border-[var(--profile-primary)] text-white" : "border-gray-800 text-gray-500"}`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">
                      Off preserves visible faction identity while removing most
                      faction styling.
                    </p>
                  </fieldset>
                  <button
                    onClick={() =>
                      setTheme(getFactionStarterTheme(owner.faction))
                    }
                    className="w-full border border-gray-700 p-2 text-xs text-gray-300 rounded"
                  >
                    <RotateCcw size={13} className="inline mr-2" />
                    Reset to {owner.faction} starter
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        "primaryColor",
                        "secondaryColor",
                        "accentColor",
                        "backgroundColor",
                      ] as const
                    ).map((key) => (
                      <label key={key} className="text-[10px] text-gray-400">
                        {key.replace("Color", "")}
                        <input
                          type="color"
                          value={theme[key]}
                          onChange={(e) =>
                            setTheme({ ...theme, [key]: e.target.value })
                          }
                          className="w-full h-10 mt-1 bg-transparent"
                        />
                      </label>
                    ))}
                  </div>
                  {(
                    [
                      ["fontFamily", ["mono", "sans", "serif", "display"]],
                      [
                        "layoutStyle",
                        ["single", "sidebar-left", "sidebar-right", "masonry"],
                      ],
                      ["spacing", ["compact", "comfortable", "spacious"]],
                      ["borderStyle", ["minimal", "solid", "double", "glow"]],
                      ["borderRadius", ["none", "small", "medium", "large"]],
                      ["effectIntensity", ["off", "low", "medium"]],
                    ] as any[]
                  ).map(([key, values]) => (
                    <label key={key} className="block text-xs text-gray-400">
                      {designControlLabels[key] || key}
                      <select
                        value={(theme as any)[key]}
                        onChange={(e) =>
                          setTheme({ ...theme, [key]: e.target.value } as any)
                        }
                        className="mt-1 w-full bg-black border border-gray-700 text-white p-2 rounded"
                      >
                        {values.map((v: string) => (
                          <option key={v} value={v}>{designValueLabels[v] || v}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <div className="grid grid-cols-3 gap-2">
                    {(["animations", "glowEffects", "scanlines"] as const).map(
                      (key) => (
                        <button
                          key={key}
                          onClick={() =>
                            setTheme({ ...theme, [key]: !theme[key] })
                          }
                          className={`p-2 border text-[10px] rounded ${theme[key] ? "border-green-600 text-green-300" : "border-gray-800 text-gray-500"}`}
                        >
                          <Check size={12} className="inline mr-1" />
                          {effectLabels[key] || key}
                        </button>
                      ),
                    )}
                  </div>
                  <label className="block text-xs text-gray-400">
                    Safe background image URL
                    <input
                      value={theme.backgroundImage}
                      onChange={(e) =>
                        setTheme({ ...theme, backgroundImage: e.target.value })
                      }
                      placeholder="https://…"
                      className="mt-1 w-full bg-black border border-gray-700 text-white p-2 rounded"
                    />
                  </label>
                </div>
              )}
              {tab === "modules" && (
                <div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={({ active, over }) => {
                      if (over && active.id !== over.id)
                        setModules((items) =>
                          arrayMove(
                            items,
                            items.findIndex((i) => i._id === active.id),
                            items.findIndex((i) => i._id === over.id),
                          ),
                        );
                    }}
                  >
                    <SortableContext
                      items={modules.map((m) => m._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {modules.map((module) => (
                          <SortableModule
                            key={module._id}
                            module={module}
                            rules={rules}
                            onToggle={(id: string) =>
                              setModules((items) =>
                                items.map((m) =>
                                  m._id === id
                                    ? { ...m, enabled: !m.enabled }
                                    : m,
                                ),
                              )
                            }
                            onRemove={(id: string) =>
                              setModules((items) =>
                                items.filter((m) => m._id !== id),
                              )
                            }
                            onRule={(id: string, value: string) =>
                              setModules((items) =>
                                items.map((m) =>
                                  m._id === id
                                    ? { ...m, accessRuleId: value }
                                    : m,
                                ),
                              )
                            }
                            onConfig={(id: string, key: string, value: unknown) =>
                              setModules((items) => items.map((m) => m._id === id ? { ...m, config: { ...(m.config || {}), [key]: value } } : m))
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <p className="text-xs text-gray-500 mt-5 mb-2">
                    Add a module
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PROFILE_MODULE_REGISTRY).map(
                      ([type, entry]) => (
                        <button
                          key={type}
                          disabled={modules.some((m) => m.type === type)}
                          onClick={() => addModule(type)}
                          className="border border-gray-700 text-gray-300 p-2 text-xs rounded disabled:opacity-30"
                        >
                          <Plus size={12} className="inline" /> {entry.label}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
              {tab === "access" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <LockKeyhole size={15} />
                    Human-readable module access
                  </div>
                  {rules.map((rule, index) => (
                    <RuleEditor
                      key={rule.id || index}
                      rule={rule}
                      onChange={(next: Rule) =>
                        setRules((items) =>
                          items.map((item, i) => (i === index ? next : item)),
                        )
                      }
                      onDelete={() =>
                        setRules((items) => items.filter((_, i) => i !== index))
                      }
                    />
                  ))}
                  <button
                    onClick={() =>
                      setRules((items) => [
                        ...items,
                        { ...defaultRule, id: `new-${crypto.randomUUID()}` },
                      ])
                    }
                    className="text-xs text-cyan-300"
                  >
                    <Plus size={13} className="inline" /> Add access rule
                  </button>
                </div>
              )}
              {tab === "friends" && <TopFriendsEditor />}
              {tab === "social" && <RelationshipManager />}
            </>
          )}
        </aside>
        <main className="profile-studio-preview overflow-auto bg-[#030303] p-3 md:p-8">
          <div
            className={`${device === "mobile" ? "max-w-[390px]" : "max-w-6xl"} ${factionVisualClass(owner.faction)} profile-layout-${resolved.layoutStyle} profile-border-${resolved.borderStyle} mx-auto transition-all profile-v2-page min-h-full p-3 md:p-6`}
            style={profileThemeStyle(resolved)}
          >
            <div
              className="mb-4 flex justify-between text-[10px] uppercase tracking-widest"
              style={{ color: "var(--profile-primary)" }}
            >
              <span>
                {owner.faction} · {influence} influence
              </span>
              <span>
                <Eye size={12} className="inline" /> Live {device} preview
              </span>
            </div>
            <ProfileV2Modules
              modules={previewModules as ProfileV2Module[]}
              userId={String(profile.user || "preview")}
              owner={owner}
              posts={[]}
              preview
            />
          </div>
        </main>
      </div>
      {status && (
        <div
          role="status"
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 bg-black border border-[#39FF14] text-white px-4 py-3 text-sm z-[220]"
        >
          {status}
        </div>
      )}
    </div>
  );
};
export default ThemeEditor;
