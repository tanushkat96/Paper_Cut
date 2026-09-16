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
  thumbnails: (string | undefined)[];
}

export function PageListEditor({
  pages,
  onChange,
  selectedPage,
  onSelectPage,
  thumbnails,
}: PageListEditorProps) {
  const moveUp = (index: number) => {
    if (index === 0) return;

    const next = [...pages];

    [next[index - 1], next[index]] = [
      next[index],
      next[index - 1],
    ];

    onChange(next);

    if (selectedPage === index) {
      onSelectPage(index - 1);
    } else if (
      selectedPage === index - 1
    ) {
      onSelectPage(index);
    }
  };

  const moveDown = (index: number) => {
    if (
      index === pages.length - 1
    ) {
      return;
    }

    const next = [...pages];

    [next[index + 1], next[index]] = [
      next[index],
      next[index + 1],
    ];

    onChange(next);

    if (selectedPage === index) {
      onSelectPage(index + 1);
    } else if (
      selectedPage === index + 1
    ) {
      onSelectPage(index);
    }
  };

  const rotate = (index: number) => {
    const next = [...pages];

    next[index] = {
      ...next[index],
      rotation:
        (next[index].rotation +
          90) %
        360,
    };

    onChange(next);
  };

  const remove = (index: number) => {
    if (pages.length === 1) {
      return;
    }

    const next = pages.filter(
      (_, currentIndex) =>
        currentIndex !== index
    );

    onChange(next);

    if (selectedPage > index) {
      onSelectPage(
        selectedPage - 1
      );
    } else if (
      selectedPage === index &&
      index >= next.length
    ) {
      onSelectPage(
        next.length - 1
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
          (page, index) => {
            const selected =
              selectedPage === index;

            return (
              <div
                key={page.id}
                className={`organize-page-card ${
                  selected
                    ? "selected"
                    : ""
                }`}
              >

                <button
                  type="button"
                  className="organize-thumbnail"
                  onClick={() =>
                    onSelectPage(
                      index
                    )
                  }
                  title={`Preview page ${
                    index + 1
                  }`}
                >
                  {thumbnails[
                    page.originalPage
                  ] ? (
                    <img
                      src={
                        thumbnails[
                          page.originalPage
                        ]
                      }
                      alt={`Page ${
                        index + 1
                      }`}
                      style={{
                        transform: `rotate(${page.rotation}deg)`,
                      }}
                    />
                  ) : (
                    <span>
                      Loading...
                    </span>
                  )}
                </button>

                <div className="organize-page-card-footer">

                  <span>
                    Page {index + 1}
                  </span>

                  <div className="organize-controls">

                    <button
                      type="button"
                      onClick={() =>
                        moveUp(index)
                      }
                      disabled={
                        index === 0
                      }
                      title="Move page up"
                      aria-label="Move page up"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveDown(index)
                      }
                      disabled={
                        index ===
                        pages.length -
                          1
                      }
                      title="Move page down"
                      aria-label="Move page down"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        rotate(index)
                      }
                      title="Rotate page"
                      aria-label="Rotate page"
                    >
                      ↻
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        remove(index)
                      }
                      disabled={
                        pages.length === 1
                      }
                      title="Remove page"
                      aria-label="Remove page"
                      className="remove"
                    >
                      ✕
                    </button>

                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>

      
    </aside>
  );
}