interface ContentSelectionPanelProps {
  selection: string;
}

export function ContentSelectionPanel({ selection }: ContentSelectionPanelProps) {
  const hasSelection = Boolean(selection);

  return (
    <div className="wxt-starter shadow-panel">
      <header>
        <strong>WXT Starter Helper</strong>
        <span className="badge">Content Script</span>
      </header>
      <section>
        <h4>Current Selection</h4>
        <p className={hasSelection ? '' : 'empty'}>
          {hasSelection ? selection : 'No selection detected'}
        </p>
      </section>
    </div>
  );
}
