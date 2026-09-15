interface PageItem {
  id: number;
  originalPage: number;
  rotation: number;
}

interface PageListEditorProps {
  pages: PageItem[];
  onChange: (pages: PageItem[]) => void;
}

export function PageListEditor({
  pages,
  onChange,
}: PageListEditorProps) {
  const moveUp = (index: number) => {
    if (index === 0) return;

    const next = [...pages];

    [next[index - 1], next[index]] = [
      next[index],
      next[index - 1],
    ];

    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === pages.length - 1) return;

    const next = [...pages];

    [next[index + 1], next[index]] = [
      next[index],
      next[index + 1],
    ];

    onChange(next);
  };

  const rotate = (index: number) => {
    const next = [...pages];

    next[index] = {
      ...next[index],
      rotation: (next[index].rotation + 90) % 360,
    };

    onChange(next);
  };

  const remove = (index: number) => {
    const next = pages.filter(
      (_, currentIndex) => currentIndex !== index
    );

    onChange(next);
  };

  return (
    <div className="file-list">
      {pages.map((page, index) => (
        <div
          className="file-list__item"
          key={page.id}
        >
          <span className="file-list__index">
            {index + 1}.
          </span>

          <div className="file-list__info">
            <p className="file-list__name">
              Page {page.originalPage + 1}
            </p>

            <p className="file-list__size">
              Rotation: {page.rotation}°
            </p>
          </div>

          <div className="file-list__controls">
            <button
              type="button"
              className="file-list__control-btn"
              onClick={() => moveUp(index)}
              disabled={index === 0}
              title="Move page up"
              aria-label={`Move page ${page.originalPage + 1
                } up`}
            >
              ↑
            </button>

            <button
              type="button"
              className="file-list__control-btn"
              onClick={() => moveDown(index)}
              disabled={index === pages.length - 1}
              title="Move page down"
              aria-label={`Move page ${page.originalPage + 1
                } down`}
            >
              ↓
            </button>

            <button
              type="button"
              className="file-list__control-btn"
              onClick={() => rotate(index)}
              title="Rotate page"
              aria-label={`Rotate page ${page.originalPage + 1
                }`}
            >
              ↻
            </button>

            <button
              type="button"
              className="file-list__control-btn file-list__control-btn--remove"
              onClick={() => remove(index)}
              title="Remove page"
              aria-label={`Remove page ${page.originalPage + 1
                }`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <div className="file-list__footer">
        <span className="file-list__count">
          {pages.length} page
          {pages.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}