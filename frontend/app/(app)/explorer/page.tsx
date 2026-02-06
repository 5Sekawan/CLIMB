"use client";

import { useState, useMemo } from "react";
import { CButton } from "@/components/climb/ui";
import { ProjectCard } from "@/components/climb/dashboard/project-card";
import {
  PlusIcon,
  MountainIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "@/components/climb/icons";
import { getAllProjects, type ProjectStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import Link from "next/link";

type FilterTab = "active" | "finished" | "inactive" | "all";

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "finished", label: "Finished" },
  { id: "inactive", label: "Inactive" },
  { id: "all", label: "All Projects" },
];

const ITEMS_PER_PAGE = 12;

export default function ExplorerIndexPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const allProjects = useMemo(() => getAllProjects(), []);

  const filteredProjects = useMemo(() => {
    let projects = allProjects;

    if (activeFilter !== "all") {
      projects = projects.filter((p) => p.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.minerals.some((m) => m.toLowerCase().includes(q)),
      );
    }

    return projects;
  }, [activeFilter, allProjects, searchQuery]);

  // Reset to page 1 when filter or search changes
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProjects = filteredProjects.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  // Counts per status
  const countByStatus = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      active: 0,
      finished: 0,
      inactive: 0,
      all: allProjects.length,
    };
    for (const p of allProjects) {
      counts[p.status as ProjectStatus]++;
    }
    return counts;
  }, [allProjects]);

  function handleFilterChange(tab: FilterTab) {
    setActiveFilter(tab);
    setCurrentPage(1);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  // Generate page numbers with ellipsis
  function getPageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [1];

    if (safePage > 3) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safePage < totalPages - 2) {
      pages.push("ellipsis");
    }

    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance">
            Map Explorer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a project to open the exploration studio, or create a new AOI.
          </p>
        </div>
        <Link href="/explorer/new">
          <CButton variant="solid" size="md" className="shrink-0">
            <PlusIcon className="h-4 w-4" />
            Create New AOI
          </CButton>
        </Link>
      </div>

      {/* Filter Tabs + Search */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1 w-fit">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-climb-fast",
                activeFilter === tab.id
                  ? "bg-card text-foreground shadow-climb-1"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                  activeFilter === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {countByStatus[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search projects..."
            className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-climb-fast focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Section Heading */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {activeFilter === "all"
            ? "All Projects"
            : activeFilter === "active"
              ? "Active Projects"
              : activeFilter === "finished"
                ? "Finished Projects"
                : "Inactive Projects"}
        </h2>
        <span className="text-xs text-muted-foreground">
          {filteredProjects.length} project
          {filteredProjects.length !== 1 ? "s" : ""}
          {totalPages > 1 && (
            <>
              {" | Page "}{safePage}{" of "}{totalPages}
            </>
          )}
        </span>
      </div>

      {/* Project Grid */}
      {paginatedProjects.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
          <MountainIcon className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {searchQuery.trim()
              ? `No projects matching "${searchQuery}" found.`
              : `No ${activeFilter} projects found.`}
          </p>
        </div>
      )}

      {/* Pagination - Always visible */}
      <div className="mt-8 flex items-center justify-center gap-1">
        {/* Previous */}
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={safePage <= 1}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm transition-colors duration-climb-fast",
            safePage <= 1
              ? "cursor-not-allowed text-muted-foreground/40"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((page, idx) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground"
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </span>
          ) : (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors duration-climb-fast",
                safePage === page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-label={`Page ${page}`}
              aria-current={safePage === page ? "page" : undefined}
            >
              {page}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage >= totalPages}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm transition-colors duration-climb-fast",
            safePage >= totalPages
              ? "cursor-not-allowed text-muted-foreground/40"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-label="Next page"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
