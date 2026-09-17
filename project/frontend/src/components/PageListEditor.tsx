import {
  type DragEvent,
} from "react";

interface PageItem {
  id: number;
  originalPage: number;
  rotation: number;
}

interface PageListEditorProps {
  pages: PageItem[];
  onChange: (pages: PageItem[]) => void;
  selectedPage: number;
  onSelectPage: (index: number) => void;
}

export function PageListEditor({
  pages,
  onChange,
  selectedPage,
  onSelectPage,
}: PageListEditorProps) {
  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    index: number
  ) => {
    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      String(index)
    );
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    dropIndex: number
  ) => {
    event.preventDefault();

    const fromIndex = Number(
      event.dataTransfer.getData(
        "text/plain"
      )
    );

    if (
      Number.isNaN(fromIndex) ||
      fromIndex === dropIndex
    ) {
      return;
    }

    const next = [...pages];

    const [movedPage] =
      next.splice(fromIndex, 1);

    next.splice(
      dropIndex,
      0,
      movedPage
    );

    onChange(next);

    /*
     * Keep the same page selected
     * after dragging.
     */
    if (selectedPage === fromIndex) {
      onSelectPage(dropIndex);
    } else if (
      fromIndex < selectedPage &&
      dropIndex >= selectedPage
    ) {
      onSelectPage(
        selectedPage - 1
      );
    } else if (
      fromIndex > selectedPage &&
      dropIndex <= selectedPage
    ) {
      onSelectPage(
        selectedPage + 1
      );
    }
  };


  return (
    <aside className="organize-sidebar">

      <div className="organize-sidebar-header">
        <strong>Pages</strong>

        <span>
          {pages.length} page
          {pages.length === 1
            ? ""
            : "s"}
        </span>
      </div>
      <div className="organize-page-list">

        {pages.map(
          (page, index) => (
            <div
              key={page.id}
              draggable
              onDragStart={(event) =>
                handleDragStart(
                  event,
                  index
                )
              }
              onDragOver={
                handleDragOver
              }
              onDrop={(event) =>
                handleDrop(
                  event,
                  index
                )
              }
              className={`organize-page-row ${selectedPage === index
                  ? "selected"
                  : ""
                }`}
              onClick={() =>
                onSelectPage(index)
              }
            >

              <span
                className="organize-drag-handle"
                title="Drag to reorder"
              >
                ⋮⋮
              </span>

              <span className="organize-page-number">
                {index + 1}
              </span>

              <span className="organize-page-name">
                Page {index + 1}
              </span>

            </div>
          )
        )}

      </div>



    </aside>
  );
}