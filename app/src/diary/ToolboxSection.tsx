/* Toolbox talk (§9): topic + presenter (memo-backed), auto time, register
   toggle chips, notes with hazard chips. Whole section optional. */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { SheetWrap } from "../components/SheetWrap";
import { db, bumpMemo, type Toolbox } from "../db";
import { Icon } from "../icons";
import { Lined } from "../components/core";
import { fmtTime } from "../lib/format";
import { tick } from "../lib/haptics";

const HAZARD_CHIPS = ["PPE", "Traffic", "Heat", "Slips", "Plant movement", "Dust", "Noise"];

export function ToolboxSection({
  toolbox,
  onChange,
}: {
  toolbox: Toolbox | null;
  onChange: (t: Toolbox | null) => void;
}) {
  const [regSheet, setRegSheet] = useState(false);
  const [newName, setNewName] = useState("");

  const topics = useLiveQuery(() => db.memo.where("kind").equals("topic").toArray(), []);
  const presenters = useLiveQuery(() => db.memo.where("kind").equals("presenter").toArray(), []);
  const register = useLiveQuery(() => db.register.toArray(), []) ?? [];

  if (!toolbox)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Optional — add a toolbox talk for this day.
        </p>
        <button
          type="button"
          className="chip self-start"
          data-testid="start-toolbox"
          onClick={() => {
            tick();
            onChange({
              topic: "",
              presenter: "",
              time: fmtTime(Date.now()),
              presentIds: [],
              notes: "",
            });
          }}
        >
          <Icon name="plus" size={16} /> Start toolbox talk
        </button>
      </div>
    );
  const t = toolbox;
  const presentSet = new Set(t.presentIds);
  const set = (patch: Partial<Toolbox>) => onChange({ ...t, ...patch });

  const toggleAll = (all: boolean) => {
    tick();
    set({ presentIds: all ? register.map((r) => r.id) : [] });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="tb-topic" className="font-display text-lg block mb-1">
          Topic
        </label>
        <div className="flex gap-2 flex-wrap mb-1">
          {(topics ?? [])
            .slice()
            .sort((a, b) => b.uses - a.uses)
            .slice(0, 4)
            .map((m) => (
              <button
                key={m.value}
                type="button"
                className={`chip ${t.topic === m.value ? "on" : ""}`}
                onClick={() => {
                  tick();
                  set({ topic: m.value });
                  void bumpMemo("topic", m.value);
                }}
                aria-pressed={t.topic === m.value}
              >
                {m.value}
              </button>
            ))}
        </div>
        <input
          id="tb-topic"
          type="text"
          value={t.topic}
          onChange={(e) => set({ topic: e.target.value })}
          onBlur={() => void bumpMemo("topic", t.topic)}
          className="btn-56 w-full px-4 text-left"
          placeholder="Type a topic…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tb-pres" className="font-display text-lg block mb-1">
            Presenter
          </label>
          <div className="flex gap-2 flex-wrap mb-1">
            {(presenters ?? [])
              .slice()
              .sort((a, b) => b.uses - a.uses)
              .slice(0, 3)
              .map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`chip ${t.presenter === m.value ? "on" : ""}`}
                  aria-pressed={t.presenter === m.value}
                  onClick={() => {
                    tick();
                    set({ presenter: m.value });
                    void bumpMemo("presenter", m.value);
                  }}
                >
                  {m.value}
                </button>
              ))}
          </div>
          <input
            id="tb-pres"
            type="text"
            value={t.presenter}
            onChange={(e) => set({ presenter: e.target.value })}
            onBlur={() => void bumpMemo("presenter", t.presenter)}
            className="btn-56 w-full px-4 text-left"
            placeholder="Name…"
          />
        </div>
        <div>
          <label htmlFor="tb-time" className="font-display text-lg block mb-1">
            Time
          </label>
          <input
            id="tb-time"
            type="time"
            value={t.time}
            onChange={(e) => set({ time: e.target.value })}
            className="btn-56 w-full px-4 text-left num"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-display text-lg flex-1">
            Present <span className="num">{t.presentIds.length} of {register.length}</span>
          </span>
          <button type="button" className="chip" onClick={() => toggleAll(true)}>
            All
          </button>
          <button type="button" className="chip" onClick={() => toggleAll(false)}>
            None
          </button>
          <button type="button" className="chip ghost" onClick={() => setRegSheet(true)}>
            <Icon name="plus" size={16} /> Name
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {register.map((r) => {
            const on = presentSet.has(r.id);
            return (
              <button
                key={r.id}
                type="button"
                className={`chip ${on ? "on" : ""}`}
                aria-pressed={on}
                aria-label={`${r.name} ${on ? "present" : "absent"}`}
                onClick={() => {
                  tick();
                  const ids = new Set(t.presentIds);
                  if (on) ids.delete(r.id);
                  else ids.add(r.id);
                  set({ presentIds: [...ids] });
                }}
              >
                {on && <Icon name="check" size={14} />}
                {r.name}
              </button>
            );
          })}
          {register.length === 0 && (
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              Add crew names to track presence.
            </span>
          )}
        </div>
      </div>

      <Lined
        label="Notes — hazards raised and agreements"
        value={t.notes}
        onChange={(v) => set({ notes: v })}
        chips={HAZARD_CHIPS}
        lines={2}
      />

      {/* add name sheet */}
      <AddNameSheet
        opened={regSheet}
        onClosed={() => setRegSheet(false)}
        title="Add a name to the register"
        value={newName}
        onValue={setNewName}
        add={() => {
          if (newName.trim())
            void db.register.put({ id: crypto.randomUUID(), name: newName.trim() });
          setNewName("");
          setRegSheet(false);
        }}
      />
    </div>
  );
}

/* Bottom sheet for the register add-name. Kept local to this file. */
function AddNameSheet({
  opened,
  onClosed,
  title,
  value,
  onValue,
  add,
}: {
  opened: boolean;
  onClosed: () => void;
  title: string;
  value: string;
  onValue: (v: string) => void;
  add: () => void;
}) {
  return (
    <SheetWrap opened={opened} onClosed={onClosed} label={title}>
      <div className="p-4">
        <span className="font-display text-2xl mb-3 block">{title}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="btn-56 w-full px-4 text-left mb-3"
          aria-label={title}
        />
        <button
          type="button"
          className="w-full font-display text-xl"
          style={{
            minHeight: 64,
            borderRadius: 14,
            background: "var(--accent)",
            color: "var(--on-accent)",
            border: 0,
          }}
          onClick={add}
        >
          Done
        </button>
      </div>
    </SheetWrap>
  );
}
