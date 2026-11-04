/* Workforce by name. People are the record; role totals are derived. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Workforce, WorkforcePerson } from "../db";
import { SheetWrap } from "../components/SheetWrap";
import { Icon } from "../icons";
import { personInitials, personName, roleCounts } from "../lib/workforce";
import { tick } from "../lib/haptics";

type GroupKey = "a" | "b";

export function WorkforceSection({
  workforce,
  roleCatalogue,
  nameSuggestions,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onGroups,
}: {
  workforce: Workforce;
  roleCatalogue: string[];
  nameSuggestions: string[];
  onAddPerson: (group: GroupKey, name: string, role: string) => void;
  onEditPerson: (group: GroupKey, id: string, name: string, role: string) => void;
  onDeletePerson: (group: GroupKey, id: string) => void;
  onGroups: (groups: [string, string]) => void;
}) {
  const [group, setGroup] = useState<GroupKey>("a");
  const [renaming, setRenaming] = useState(false);
  const [sheet, setSheet] = useState<{
    group: GroupKey;
    person?: WorkforcePerson;
  } | null>(null);

  const groupIndex = group === "a" ? 0 : 1;
  const groupName = workforce.groups[groupIndex] || (group === "a" ? "Own crew" : "Subcontractors");
  const people = workforce[group];
  const roles = roleCounts(people);

  const rename = (index: 0 | 1, value: string) => {
    const groups: [string, string] = [workforce.groups[0], workforce.groups[1]];
    groups[index] = value;
    onGroups(groups);
  };

  const openAdd = () => {
    tick();
    setSheet({ group });
  };
  const openEdit = (person: WorkforcePerson) => {
    tick();
    setSheet({ group, person });
  };

  return (
    <div className="wf-shell">
      <div className="wf-tabs" role="tablist" aria-label="Workforce groups">
        {(["a", "b"] as const).map((key) => {
          const index = key === "a" ? 0 : 1;
          const active = group === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`wf-tab-${key}`}
              aria-selected={active}
              aria-controls="wf-panel"
              tabIndex={active ? 0 : -1}
              className="wf-tab"
              onClick={() => {
                tick();
                setGroup(key);
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const next = key === "a" ? "b" : "a";
                setGroup(next);
                document.getElementById(`wf-tab-${next}`)?.focus();
              }}
            >
              <span className="wf-tab-name">{workforce.groups[index] || "Group"}</span>
              <span className="wf-tab-count num">{workforce[key].length}</span>
            </button>
          );
        })}
      </div>

      <div
        id="wf-panel"
        role="tabpanel"
        aria-labelledby={`wf-tab-${group}`}
        className="wf-content"
      >
        <div className="wf-heading">
          <div className="min-w-0">
            <span className="wf-kicker">On site now</span>
            <p className="wf-total">
              <b className="num">{people.length}</b>{" "}
              {people.length === 1 ? "person" : "people"}
            </p>
          </div>
          <button
            type="button"
            className="chip ghost !min-h-11"
            aria-expanded={renaming}
            onClick={() => {
              tick();
              setRenaming((v) => !v);
            }}
          >
            <Icon name="pencil" size={16} />
            Rename
          </button>
        </div>

        {renaming && (
          <div className="wf-rename">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(["a", "b"] as const).map((key) => {
                const index = key === "a" ? 0 : 1;
                return (
                  <label key={key} className="wf-field">
                    <span>Group {index + 1} name</span>
                    <input
                      type="text"
                      value={workforce.groups[index]}
                      onChange={(e) => rename(index, e.target.value)}
                      onBlur={(e) =>
                        !e.target.value.trim() &&
                        rename(index, index === 0 ? "Own crew" : "Subcontractors")
                      }
                      className="btn-56 w-full px-3 text-left"
                      aria-label={`Group ${index + 1} name`}
                    />
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              className="chip mt-2"
              onClick={() => setRenaming(false)}
            >
              <Icon name="check" size={16} /> Done
            </button>
          </div>
        )}

        <button
          type="button"
          className="wf-add"
          data-testid="add-person"
          onClick={openAdd}
        >
          <Icon name="plus" size={22} />
          Add person to {groupName}
        </button>

        {people.length === 0 ? (
          <div className="wf-empty">
            <span className="wf-empty-icon" aria-hidden>
              <Icon name="users" size={30} duo />
            </span>
            <b>No one in {groupName} yet</b>
            <p>Add each person by name and role. One row is one person.</p>
          </div>
        ) : (
          <ul className="wf-list" aria-label={`${groupName} people`}>
            {people.map((person) => {
              const label = personName(person);
              const unnamed = !person.name.trim();
              return (
                <li key={person.id} className="wf-person row-vt">
                  <span className="wf-avatar" aria-hidden>
                    {personInitials(person)}
                  </span>
                  <span className="wf-person-main">
                    <b className={unnamed ? "wf-unnamed" : ""}>{label}</b>
                    <span className="wf-role-pill">{person.role || "No role"}</span>
                  </span>
                  <button
                    type="button"
                    className="btn-56 !min-h-10 !min-w-10"
                    aria-label={`Edit ${label}`}
                    onClick={() => openEdit(person)}
                  >
                    <Icon name="pencil" size={17} />
                  </button>
                  <button
                    type="button"
                    className="btn-56 !min-h-10 !min-w-10"
                    aria-label={`Remove ${label}`}
                    onClick={() => onDeletePerson(group, person.id)}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {roles.length > 0 && (
          <div className="wf-role-strip" aria-label="Role totals">
            <span className="wf-strip-label">Roles in {groupName}</span>
            <div className="flex flex-wrap gap-1.5">
              {roles.map(({ role, count }) => (
                <span key={role} className="wf-role-total">
                  {role} <b className="num">{count}</b>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <PersonSheet
        opened={!!sheet}
        onClosed={() => setSheet(null)}
        groupName={groupName}
        person={sheet?.person}
        roles={roleCatalogue}
        names={nameSuggestions}
        onSave={(name, role) => {
          if (!sheet) return;
          if (sheet.person) {
            onEditPerson(sheet.group, sheet.person.id, name, role);
          } else {
            onAddPerson(sheet.group, name, role);
          }
        }}
      />
    </div>
  );
}

function PersonSheet({
  opened,
  onClosed,
  groupName,
  person,
  roles,
  names,
  onSave,
}: {
  opened: boolean;
  onClosed: () => void;
  groupName: string;
  person?: WorkforcePerson;
  roles: string[];
  names: string[];
  onSave: (name: string, role: string) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const roleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!opened) return;
    setName(person?.name ?? "");
    setRole(person?.role ?? "");
  }, [opened, person]);

  const editing = !!person;
  const canSave = !!name.trim() && !!role.trim();
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSave) return;
    tick();
    onSave(name.trim(), role.trim());
    onClosed();
  };

  return (
    <SheetWrap
      opened={opened}
      onClosed={onClosed}
      label={editing ? "Edit person" : "Add person"}
    >
      <form className="wf-sheet" onSubmit={submit}>
        <div className="wf-sheet-head">
          <div>
            <span className="wf-kicker">{editing ? "Edit person" : "New person"}</span>
            <h3 className="font-display text-2xl leading-none">{groupName}</h3>
          </div>
          <button
            type="button"
            className="btn-56 !min-h-10 !min-w-10"
            aria-label="Close"
            onClick={onClosed}
          >
            <Icon name="minus" size={20} />
          </button>
        </div>

        <label className="wf-field" htmlFor="wf-name">
          <span>Name <em>required</em></span>
          <input
            id="wf-name"
            data-testid="person-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              roleRef.current?.focus();
            }}
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            autoFocus
            className="btn-56 w-full px-4 text-left"
            placeholder="e.g. Andre Brown"
          />
        </label>

        {names.length > 0 && !editing && (
          <div className="wf-suggestions">
            <span>Recent</span>
            <div className="flex flex-wrap gap-1.5">
              {names.slice(0, 4).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip !min-h-10 ${name === n ? "on" : ""}`}
                  onClick={() => {
                    tick();
                    setName(n);
                    roleRef.current?.focus();
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="wf-field" htmlFor="wf-role">
          <span>Role <em>required</em></span>
          <input
            id="wf-role"
            ref={roleRef}
            data-testid="person-role"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            list="wf-role-options"
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="done"
            className="btn-56 w-full px-4 text-left"
            placeholder="Choose or type a trade"
          />
          <datalist id="wf-role-options">
            {roles.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <div className="wf-suggestions">
          <span>Common roles</span>
          <div className="flex flex-wrap gap-1.5">
            {roles.slice(0, 8).map((r) => (
              <button
                key={r}
                type="button"
                className={`chip !min-h-10 ${role === r ? "on" : ""}`}
                aria-pressed={role === r}
                onClick={() => {
                  tick();
                  setRole(r);
                }}
              >
                {role === r && <Icon name="check" size={14} />}
                {r}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="wf-save"
          data-testid="save-person"
          disabled={!canSave}
        >
          {editing ? "Save changes" : "Add person"}
        </button>
        <p className="wf-sheet-note">
          One row is one person. Role totals add up automatically.
        </p>
      </form>
    </SheetWrap>
  );
}
