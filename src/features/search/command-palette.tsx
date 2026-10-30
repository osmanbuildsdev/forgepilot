"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CircleCheck,
  FolderKanban,
  Inbox,
  Moon,
  Plus,
  Search,
  Sparkles,
  SquareCheck,
  User,
  Users,
  LayoutDashboard,
} from "lucide-react";
import { search, type SearchHit } from "@/server/search/actions";
import { unwrap } from "@/lib/action-result";

type Entry = {
  id: string;
  title: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
};

const kindIcon = {
  task: <SquareCheck size={15} />,
  project: <FolderKanban size={15} />,
  person: <User size={15} />,
};
const kindLabel = { task: "Görevler", project: "Projeler", person: "Kişiler" };

export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setActive(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced server search; stale responses are ignored.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(() => {
      search(q)
        .then(unwrap)
        .then((r) => id === requestId.current && setHits(r))
        .catch(() => id === requestId.current && setHits([]))
        .finally(() => id === requestId.current && setLoading(false));
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const commands: Entry[] = useMemo(
    () => [
      {
        id: "new",
        title: "Yeni proje oluştur",
        icon: <Plus size={15} />,
        run: () => go("/app/projects/new"),
      },
      {
        id: "ai",
        title: "AI ile proje planla",
        icon: <Sparkles size={15} />,
        run: () => go("/app/projects/new/ai"),
      },
      {
        id: "home",
        title: "Genel bakış",
        icon: <LayoutDashboard size={15} />,
        run: () => go("/app"),
      },
      {
        id: "tasks",
        title: "Görevlerim",
        icon: <CircleCheck size={15} />,
        run: () => go("/app/tasks"),
      },
      {
        id: "inbox",
        title: "Gelen kutusu",
        icon: <Inbox size={15} />,
        run: () => go("/app/inbox"),
      },
      {
        id: "projects",
        title: "Projeler",
        icon: <FolderKanban size={15} />,
        run: () => go("/app/projects"),
      },
      {
        id: "members",
        title: "Üyeler ve davetler",
        icon: <Users size={15} />,
        run: () => go("/app/settings/members"),
      },
      {
        id: "theme",
        title: resolvedTheme === "dark" ? "Açık temaya geç" : "Koyu temaya geç",
        icon: <Moon size={15} />,
        run: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          close();
        },
      },
    ],
    [go, close, resolvedTheme, setTheme],
  );

  const q = query.trim().toLocaleLowerCase("tr-TR");
  const groups: [string, Entry[]][] = [];
  const matchedCommands = commands.filter((c) =>
    c.title.toLocaleLowerCase("tr-TR").includes(q),
  );
  for (const kind of ["task", "project", "person"] as const) {
    const items = hits.filter((h) => h.kind === kind);
    if (items.length)
      groups.push([
        kindLabel[kind],
        items.map((h) => ({
          id: `${h.kind}:${h.id}`,
          title: h.title,
          hint: h.hint,
          icon: kindIcon[h.kind],
          run: () => go(h.href),
        })),
      ]);
  }
  if (matchedCommands.length) groups.push(["Komutlar", matchedCommands]);
  const flat = groups.flatMap(([, items]) => items);

  useEffect(() => setActive(0), [query, hits.length]);

  if (!open) return null;
  let index = -1;
  return (
    <div
      className="modal-backdrop palette-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Komut paleti"
      >
        <div className="palette-input">
          <Search size={16} className="subtle" />
          <input
            ref={inputRef}
            value={query}
            placeholder="Görev, proje veya kişi ara… (ör. FORGE-24)"
            aria-label="Ara"
            aria-controls="palette-results"
            aria-activedescendant={
              flat[active] ? `palette-${flat[active].id}` : undefined
            }
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, flat.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                flat[active]?.run();
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-results" id="palette-results" role="listbox">
          {groups.map(([label, items]) => (
            <div key={label}>
              <div className="palette-group">{label}</div>
              {items.map((item) => {
                index += 1;
                const i = index;
                return (
                  <div
                    key={item.id}
                    id={`palette-${item.id}`}
                    role="option"
                    aria-selected={i === active}
                    className={`palette-item ${i === active ? "active" : ""}`}
                    onMouseMove={() => setActive(i)}
                    onClick={item.run}
                  >
                    <span className="subtle">{item.icon}</span>
                    <span className="truncate">{item.title}</span>
                    {item.hint && (
                      <span className="subtle truncate palette-hint">
                        {item.hint}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {q && !loading && flat.length === 0 && (
            <p className="subtle" style={{ padding: "16px 14px" }}>
              &ldquo;{query}&rdquo; için sonuç yok.
            </p>
          )}
          {loading && hits.length === 0 && (
            <p
              className="subtle"
              style={{ padding: "10px 14px", fontSize: 12 }}
            >
              Aranıyor…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SearchTrigger() {
  return (
    <button
      className="search-trigger"
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
    >
      <Search size={14} />
      <span>Ara veya komut çalıştır</span>
      <kbd>Ctrl K</kbd>
    </button>
  );
}
