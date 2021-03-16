export const APP_STYLES = {
  ':host': {
    display: 'grid',
    gridTemplateRows: 'min-content 1fr',
    gridGap: 'var(--step-mid)',
    color: 'var(--color-1)',
    backgroundColor: 'var(--color-2)',
    padding: 'var(--step-mid)',
    height: '100vh',
    maxHeight: '100vh',
    boxSizing: 'border-box',
  },
  toolbar: {
    display: 'grid',
    gridTemplateColumns: 'min-content auto min-content min-content',
    gridGap: 'var(--step-mid)',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gridGap: 'var(--step-mid)',
    maxHeight: 'calc(100vh - var(--step-mid) * 3 - var(--tap-size))',
  },
  col: {
    padding: 'var(--step-mid)',
    paddingBottom: 0,
    backgroundColor: 'var(--shade-1)',
    borderRadius: 'var(--radius-1)',
    overflow: 'auto',
    maxHeight: '100%',
  },
};

export const ITEM_STYLES = {
  ':host': {
    display: 'grid',
    color: 'var(--color-2)',
    backgroundColor: 'var(--color-1)',
    borderRadius: 'var(--radius-1)',
    marginBottom: 'var(--step-mid)',
    overflow: 'hidden',
  },
  heading: {
    padding: 'var(--step-mid)',
    outline: 'none',
  },
  task_description: {
    outline: 'none',
    minHeight: '60px',
    padding: 'var(--step-mid)',
    backgroundColor: 'var(--shade-2)',
    borderTop: '1px solid var(--shade-2)',
  },
};
