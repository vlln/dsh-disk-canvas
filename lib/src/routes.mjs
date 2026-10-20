// 路由常量：客户端与宿主共用同一份字面量，避免两处漂移。
export const ROUTE_PREFIX = '/plugins/dsh-disk-canvas'
export const PATHS = Object.freeze({
  state: `${ROUTE_PREFIX}/state`,
  scan: `${ROUTE_PREFIX}/scan`,
  annotate: `${ROUTE_PREFIX}/annotate`,
  index: `${ROUTE_PREFIX}/index`,
  config: `${ROUTE_PREFIX}/config`,
  undo: `${ROUTE_PREFIX}/undo`,
  bind: `${ROUTE_PREFIX}/bind`,
  execute: `${ROUTE_PREFIX}/execute`,
  executePreview: `${ROUTE_PREFIX}/execute/preview`,
  ask: `${ROUTE_PREFIX}/ask`,
  organize: `${ROUTE_PREFIX}/organize`,
  organizePlan: `${ROUTE_PREFIX}/organize/plan`,
  organizePlanExecute: `${ROUTE_PREFIX}/organize/plan/execute`,
  organizePreview: `${ROUTE_PREFIX}/organize/preview`,
  organizeExecute: `${ROUTE_PREFIX}/organize/execute`,
  organizeUndo: `${ROUTE_PREFIX}/organize/undo`,
  organizeUndoPreview: `${ROUTE_PREFIX}/organize/undo/preview`,
})
/** 画布页在侧边栏与 main 槽里的同一个 id。 */
export const PANEL_ID = 'dsh-disk-canvas'
