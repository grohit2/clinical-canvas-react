import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRightLeft, Sparkles, Layers3, FolderOpen, Upload } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomBar } from '@/components/layout/BottomBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import PhotoUploader from '@/domains/patient-registration/components/PhotoUploader';
import { DOC_CATEGORIES } from '../../core/categories';
import { mapCategoryDocumentsFromApi } from '../../core/mapFromApi';
import type { DocCategory, DocumentItem } from '../../core/types';
import { CategoryChips } from '../components/CategoryChips.web';
import { DocumentGrid } from '../components/DocumentGrid.web';
import { getCategoryConfig } from '../categoryConfig.web';
import { useDeleteDocument, useMoveDocument, usePatientDocumentsProfile } from '../hooks/usePatientDocuments';

type CategorySection = {
  category: DocCategory;
  config: ReturnType<typeof getCategoryConfig>;
  documents: DocumentItem[];
};

export function DocumentsRootPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profile, isLoading, error, refetch } = usePatientDocumentsProfile(patientId);
  const deleteDocument = useDeleteDocument(patientId);
  const moveDocument = useMoveDocument(patientId);
  const contentPaneRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Partial<Record<DocCategory, HTMLElement | null>>>({});

  const [activeSection, setActiveSection] = useState<DocCategory>(DOC_CATEGORIES[0]);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [documentToMove, setDocumentToMove] = useState<DocumentItem | null>(null);
  const [moveTargetCategory, setMoveTargetCategory] = useState<DocCategory>(DOC_CATEGORIES[0]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  const sections = useMemo<CategorySection[]>(() => {
    if (!patientId || !profile) return [];

    return DOC_CATEGORIES.map((category) => ({
      category,
      config: getCategoryConfig(category),
      documents: mapCategoryDocumentsFromApi(patientId, profile, category),
    }));
  }, [patientId, profile]);

  const sectionCounts = useMemo<Record<DocCategory, number>>(() => {
    return DOC_CATEGORIES.reduce((counts, category) => {
      counts[category] = sections.find((section) => section.category === category)?.documents.length ?? 0;
      return counts;
    }, {} as Record<DocCategory, number>);
  }, [sections]);

  const totalDocuments = useMemo(
    () => sections.reduce((acc, section) => acc + section.documents.length, 0),
    [sections]
  );
  const activeSectionConfig = useMemo(() => getCategoryConfig(activeSection), [activeSection]);
  const ActiveSectionIcon = activeSectionConfig.icon;

  const handleScrollToSection = (category: DocCategory) => {
    setActiveSection(category);
    const element = sectionRefs.current[category];
    if (!element) return;

    const desktopWorkspace = window.matchMedia('(min-width: 1024px)').matches;
    if (desktopWorkspace && contentPaneRef.current) {
      contentPaneRef.current.scrollTo({
        top: Math.max(element.offsetTop - 24, 0),
        behavior: 'smooth',
      });
      return;
    }

    const rect = element.getBoundingClientRect();
    window.scrollTo({
      top: rect.top + window.scrollY - 96,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const desktopWorkspace = window.matchMedia('(min-width: 1024px)').matches;
      const container = contentPaneRef.current;

      if (desktopWorkspace && container) {
        const scrollTop = container.scrollTop;
        const maxScrollTop = container.scrollHeight - container.clientHeight;

        if (scrollTop >= maxScrollTop - 32) {
          setActiveSection(DOC_CATEGORIES[DOC_CATEGORIES.length - 1]);
          return;
        }

        let currentSection = DOC_CATEGORIES[0];
        for (const category of DOC_CATEGORIES) {
          const section = sectionRefs.current[category];
          if (!section) continue;
          if (section.offsetTop - scrollTop <= 120) {
            currentSection = category;
          }
        }

        setActiveSection(currentSection);
        return;
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const viewport = window.innerHeight;

      if (scrollTop + viewport >= docHeight - 50) {
        setActiveSection(DOC_CATEGORIES[DOC_CATEGORIES.length - 1]);
        return;
      }

      let currentSection = DOC_CATEGORIES[0];
      for (const category of DOC_CATEGORIES) {
        const section = sectionRefs.current[category];
        if (!section) continue;
        const rect = section.getBoundingClientRect();
        if (rect.top <= 180) {
          currentSection = category;
        }
      }

      setActiveSection(currentSection);
    };

    const container = contentPaneRef.current;
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    container?.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      container?.removeEventListener('scroll', handleScroll);
    };
  }, [sections.length]);

  const handleDeleteSingle = (doc: DocumentItem) => {
    setDocumentToDelete(doc);
    setConfirmDeleteOpen(true);
  };

  const handleMoveSingle = (doc: DocumentItem) => {
    const fallbackCategory = DOC_CATEGORIES.find((category) => category !== doc.category) ?? doc.category;
    setDocumentToMove(doc);
    setMoveTargetCategory(doc.category === 'staging_area' ? fallbackCategory : 'staging_area');
    setMoveDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!documentToDelete || !patientId) return;

    try {
      await deleteDocument.mutateAsync({
        category: documentToDelete.category,
        key: documentToDelete.remoteKey || documentToDelete.id,
      });
      setDocumentToDelete(null);
      setConfirmDeleteOpen(false);
    } catch (deleteError) {
      console.error('Delete failed:', deleteError);
    }
  };

  const executeMove = async () => {
    if (!documentToMove || !patientId || moveTargetCategory === documentToMove.category) return;

    try {
      await moveDocument.mutateAsync({
        fromCategory: documentToMove.category,
        toCategory: moveTargetCategory,
        key: documentToMove.remoteKey || documentToMove.id,
      });
      setDocumentToMove(null);
      setMoveDialogOpen(false);
    } catch (moveError) {
      console.error('Move failed:', moveError);
    }
  };

  const categoryCount = sections.filter((section) => section.documents.length > 0).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      <Header
        title="Documents"
        showBack
        onBack={() => navigate(-1)}
        className="sticky top-0 z-30 !border-slate-200/80 !bg-white/90 backdrop-blur"
      />

      {sections.length > 0 && (
        <div className="sticky top-14 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur lg:hidden">
          <CategoryChips
            selectedCategory={activeSection}
            onSelectCategory={handleScrollToSection}
            counts={sectionCounts}
            showAll={false}
            className="pb-0"
          />
        </div>
      )}

      <main className="mx-auto w-full max-w-[1600px] px-4 py-4 md:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_52%,#ecfeff_100%)] px-5 py-5 md:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Documents workspace
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  All Documents
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Jump between categories from the left rail on desktop or the chip strip on mobile.
                  Every category stays in one responsive workspace so the full record is always one
                  scroll away.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[22rem]">
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FolderOpen className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">Total</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{totalDocuments}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Layers3 className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">Categories</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold">{categoryCount}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <ActiveSectionIcon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">Active</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold leading-tight">{activeSectionConfig.title}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Upload className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">Uploads</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold leading-tight">Per category</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[112px_minmax(0,1fr)]">
            <aside className="hidden border-r border-slate-200 bg-slate-50/90 lg:block">
              <div className="flex h-full flex-col items-center gap-4 p-4">
                <div className="w-full rounded-3xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Sections
                  </p>
                </div>

                <div className="flex w-full flex-1 flex-col items-center gap-3 overflow-y-auto pb-2">
                  {sections.map(({ category, config, documents }) => {
                    const isActive = activeSection === category;

                    return (
                      <button
                        key={category}
                        type="button"
                        title={config.title}
                        aria-label={config.title}
                        onClick={() => handleScrollToSection(category)}
                        className={cn(
                          'w-full rounded-[1.65rem] border px-2 py-4 text-center transition-all',
                          isActive
                            ? 'border-sky-200 bg-sky-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <div
                          className={cn(
                            'mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold tracking-[0.18em] text-white',
                            config.bgFrom,
                            config.bgTo
                          )}
                        >
                          {config.shortLabel}
                        </div>
                        <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          {documents.length}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            <div
              ref={contentPaneRef}
              className="min-w-0 bg-white px-4 py-4 md:px-6 md:py-6 lg:h-[calc(100vh-13.5rem)] lg:overflow-y-auto"
            >
              {isLoading && (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-48 rounded-3xl border border-slate-200 bg-slate-100 animate-pulse"
                    />
                  ))}
                </div>
              )}

              {error && (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-12 text-center text-rose-600">
                  Failed to load documents. Please try again.
                </div>
              )}

              {!isLoading && !error && (
                <div className="space-y-8">
                  {sections.map(({ category, config, documents }) => {
                    const Icon = config.icon;

                    return (
                      <section
                        key={category}
                        id={category}
                        ref={(node) => {
                          sectionRefs.current[category] = node;
                        }}
                        className="scroll-mt-28 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-4 shadow-sm md:p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-4">
                            <div
                              className={cn(
                                'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm',
                                config.bgFrom,
                                config.bgTo
                              )}
                            >
                              <Icon className="h-7 w-7 text-white" />
                            </div>

                            <div>
                              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Category
                              </div>
                              <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                                {config.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-600">
                                {documents.length}{' '}
                                {documents.length === 1 ? 'document' : 'documents'} in this folder
                              </p>
                            </div>
                          </div>

                          {patientId && (
                            <PhotoUploader
                              patientId={patientId}
                              category={category}
                              onUploadComplete={() => refetch()}
                            />
                          )}
                        </div>

                        <div className="mt-5">
                          {documents.length > 0 ? (
                            <DocumentGrid
                              documents={documents}
                              columns={4}
                              onDelete={handleDeleteSingle}
                              onMove={handleMoveSingle}
                            />
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
                              <div
                                className={cn(
                                  'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm',
                                  config.bgFrom,
                                  config.bgTo
                                )}
                              >
                                <Icon className="h-7 w-7 text-white" />
                              </div>
                              <h4 className="mt-4 text-base font-semibold text-slate-900">
                                No {config.title.toLowerCase()} yet
                              </h4>
                              <p className="mt-2 text-sm leading-6 text-slate-500">
                                Upload the first document here to start filling out this category.
                              </p>
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <BottomBar />

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open);
          if (!open) setDocumentToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The document will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteDocument.isPending}
              onClick={() => setDocumentToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} disabled={deleteDocument.isPending}>
              {deleteDocument.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={moveDialogOpen}
        onOpenChange={(open) => {
          setMoveDialogOpen(open);
          if (!open) setDocumentToMove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move this document?</AlertDialogTitle>
            <AlertDialogDescription>
              Move the selected file into another section. Use Staging Area as the holding bucket
              for uploads that still need to be filed properly.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                {documentToMove?.name || 'Selected document'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Current section:{' '}
                {documentToMove ? getCategoryConfig(documentToMove.category).title : 'Unknown'}
              </p>
            </div>

            <label className="block text-sm font-medium text-slate-700" htmlFor="move-target-category">
              Target section
            </label>
            <div className="relative">
              <ArrowRightLeft className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                id="move-target-category"
                value={moveTargetCategory}
                onChange={(event) => setMoveTargetCategory(event.target.value as DocCategory)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              >
                {DOC_CATEGORIES.filter((category) => category !== documentToMove?.category).map((category) => (
                  <option key={category} value={category}>
                    {getCategoryConfig(category).title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={moveDocument.isPending}
              onClick={() => setDocumentToMove(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeMove} disabled={moveDocument.isPending}>
              {moveDocument.isPending ? 'Moving…' : 'Move'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
