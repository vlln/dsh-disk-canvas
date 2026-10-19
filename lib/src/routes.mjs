// 路由常量：客户端与宿主共用同一份字面量，避免两处漂移。
export const ROUTE_PREFIX = '/plugins/dsh-disk-canvas'
export const PATHS = Object.freeze({
  state: `${ROUTE_PREFIX}/state`,
  scan: `${ROUTE_PREFIX}/scan`,
  annotate: `${ROUTE_PREFIX}/annotate`,
  plan: `${ROUTE_PREFIX}/plan`,
  patterns: `${ROUTE_PREFIX}/patterns`,
  config: `${ROUTE_PREFIX}/config`,
  quarantine: `${ROUTE_PREFIX}/quarantine`,
})
/** 画布页在侧边栏与 main 槽里的同一个 id。 */
export const PANEL_ID = 'dsh-disk-canvas'
