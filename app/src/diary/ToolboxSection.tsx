/* Toolbox talk (§9): topic + presenter (memo-backed), auto time, attendance
   drawn from the named workforce, notes with hazard chips. Optional. */
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { bumpMemo, db, type Toolbox, type WorkforcePerson } from "../db";
import { Icon } from "../icons";
import { Lined } from "../components/core";
import { fmtTime } from "../lib/format";
import { personName } from "../lib/workforce";
import { tick } from "../lib/haptics";

const HAZARD_CHIPS = ["PPE", "Traffic", "Heat", "Slips", "Plant movement", "Dust", "Noise"];

export function ToolboxSection({
  toolbox,
  people,
  onChange,
  onOpenWorkforce,
}: {
  toolbox: Toolbox | null;
  people: WorkforcePerson[];
  onChange: (t: Toolbox | null) => void;
  onOpenWorkforce: () => void;
}) {
  const topics = useLiveQuery(() => db.memo.where("kind").equals("topic").toArray(), []);
  const presenters = useLiveQuery(() => db.memo.where("kind").equals("presenter").toArray(), []);
  const personNames = [...new Set(people.map((p) => p.name.trim()).filter(Boolean))];
  const presenterOptions = [
    ...new Set([
      ...personNames,
      ...(presenters ?? [])
        .slice()
        .sort((a, b) => b.uses - a.uses)
        .map((m) => m.value),
    ]),
  ].slice(0, 3);

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
              presenter: personNames[0] ?? "",
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
  const presentCount = people.filter((p) => presentSet.has(p.id)).length;
  const set = (patch: Partial<Toolbox>) => onChange({ ...t, ...patch });

  const toggleAll = (all: boolean) => {
    tick();
    set({ presentIds: all ? people.map((p) => p.id) : [] });
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
            {presenterOptions.map((name) => (
              <button
                key={name}
                type="button"
                className={`chip ${t.presenter === name ? "on" : ""}`}
                aria-pressed={t.presenter === name}
                onClick={() => {
                  tick();
                  set({ presenter: name });
                  void bumpMemo("presenter", name);
                }}
              >
                {name}
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
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-display text-lg flex-1">
            Present{" "}
            <span className="num">
              {presentCount} of {people.length}
            </span>
          </span>
          <button
            type="button"
            className="chip !min-h-10"
            onClick={() => toggleAll(true)}
            disabled={people.length === 0}
          >
            All present
          </button>
          <button
            type="button"
            className="chip !min-h-10"
            onClick={() => toggleAll(false)}
          >
            None
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {people.map((person) => {
            const on = presentSet.has(person.id);
            const name = personName(person);
            return (
              <button
                key={person.id}
                type="button"
                className={`chip ${on ? "on" : ""}`}
                aria-pressed={on}
                aria-label={`${name}, ${person.role}: ${on ? "present" : "absent"}`}
                title={`${name} — ${person.role}`}
                onClick={() => {
                  tick();
                  const ids = new Set(t.presentIds);
                  if (on) ids.delete(person.id);
                  else ids.add(person.id);
                  set({ presentIds: [...ids] });
                }}
              >
                {on && <Icon name="check" size={14} />}
                {name}
              </button>
            );
          })}
          {people.length === 0 && (
            <button type="button" className="chip ghost" onClick={onOpenWorkforce}>
              <Icon name="plus" size={16} /> Add people in Workforce
            </button>
          )}
        </div>
        {people.length > 0 && (
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            Attendance uses the named workforce. Remove someone there and they leave this
            register too.
          </p>
        )}
      </div>

      <Lined
        label="Notes — hazards raised and agreements"
        value={t.notes}
        onChange={(v) => set({ notes: v })}
        chips={HAZARD_CHIPS}
        lines={2}
      />
    </div>
  );
}
