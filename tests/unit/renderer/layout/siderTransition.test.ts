import { describe, expect, it } from 'vitest';

import { createSiderTransitionState, siderTransitionReducer } from '@renderer/hooks/ui/siderTransition';

describe('sider transition state', () => {
  it('starts the closing animation by collapsing the layout slot', () => {
    const expanded = createSiderTransitionState(false);
    const closing = siderTransitionReducer(expanded, { type: 'set-target', collapsed: true });

    expect(closing.phase).toBe('closing');
    expect(closing.layoutCollapsed).toBe(true);
    expect(closing.contentCollapsed).toBe(false);

    const collapsed = siderTransitionReducer(closing, { type: 'complete' });

    expect(collapsed.phase).toBe('collapsed');
    expect(collapsed.layoutCollapsed).toBe(true);
    expect(collapsed.contentCollapsed).toBe(true);
  });

  it('starts the opening animation with the layout slot and surface visible', () => {
    const collapsed = createSiderTransitionState(true);
    const opening = siderTransitionReducer(collapsed, { type: 'set-target', collapsed: false });

    expect(opening.phase).toBe('opening');
    expect(opening.layoutCollapsed).toBe(false);
    expect(opening.contentCollapsed).toBe(false);

    const expanded = siderTransitionReducer(opening, { type: 'complete' });
    expect(expanded.phase).toBe('expanded');
    expect(expanded.layoutCollapsed).toBe(false);
  });

  it('completes an active transition without a surface transform state', () => {
    const opening = siderTransitionReducer(createSiderTransitionState(true), {
      type: 'set-target',
      collapsed: false,
    });

    const expanded = siderTransitionReducer(opening, { type: 'complete' });
    expect(expanded).not.toEqual(opening);
    expect(expanded.phase).toBe('expanded');
  });

  it('reverses an in-flight target without collapsing the layout', () => {
    const closing = siderTransitionReducer(createSiderTransitionState(false), {
      type: 'set-target',
      collapsed: true,
    });

    const opening = siderTransitionReducer(closing, { type: 'set-target', collapsed: false });

    expect(opening.phase).toBe('opening');
    expect(opening.layoutCollapsed).toBe(false);
  });
});
