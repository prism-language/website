import crypto from "node:crypto";
import { PROPAGATED_ASSET_FLAG } from "../../../content/consts.js";
import { hasContentFlag } from "../../../content/utils.js";
import { ASTRO_VITE_ENVIRONMENT_NAMES } from "../../constants.js";
import { removeQueryString } from "../../path.js";
import { rootRelativePath } from "../../viteUtils.js";
import { moduleIsTopLevelPage } from "../graph.js";
import { isContentDataIncrementalModule } from "../incremental-metadata.js";
import { getPageDataByViteID } from "../internal.js";
function collectTransitiveDeps(graph, rootId) {
  const deps = /* @__PURE__ */ new Set();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.pop();
    if (deps.has(current)) continue;
    const modInfo = graph.getModuleInfo(current);
    if (isContentDataIncrementalModule(modInfo)) continue;
    deps.add(current);
    if (!modInfo) continue;
    for (const dep of modInfo.importedIds) {
      if (!deps.has(dep)) queue.push(dep);
    }
    for (const dep of modInfo.dynamicallyImportedIds) {
      if (!deps.has(dep)) queue.push(dep);
    }
  }
  return [...deps].sort();
}
function hashModules(graph, sortedIds) {
  const hasher = crypto.createHash("sha256");
  for (const id of sortedIds) {
    hasher.update(id);
    hasher.update("\n");
    const code = graph.getModuleInfo(id)?.code;
    if (code != null) {
      hasher.update(code);
    }
    hasher.update("\n");
  }
  return hasher.digest("hex");
}
function collectClientEntrypointHashes(graph, entrypointIds, pagesByEntrypoint, hashesByComponent) {
  for (const entrypointId of entrypointIds) {
    const pages = pagesByEntrypoint.get(entrypointId);
    if (!pages?.size) continue;
    const hash = hashModules(graph, collectTransitiveDeps(graph, entrypointId));
    for (const pageData of pages) {
      let list = hashesByComponent.get(pageData.component);
      if (!list) {
        list = [];
        hashesByComponent.set(pageData.component, list);
      }
      list.push(hash);
    }
  }
}
function foldClientDependencies(graph, internals) {
  const baseHashes = internals.pageDependencyHashes;
  if (!baseHashes) return;
  const hashesByComponent = /* @__PURE__ */ new Map();
  collectClientEntrypointHashes(
    graph,
    internals.discoveredClientOnlyComponents.keys(),
    internals.pagesByClientOnly,
    hashesByComponent
  );
  collectClientEntrypointHashes(
    graph,
    internals.discoveredScripts,
    internals.pagesByScriptId,
    hashesByComponent
  );
  for (const [component, clientHashes] of hashesByComponent) {
    const hasher = crypto.createHash("sha256");
    hasher.update(baseHashes.get(component) ?? "");
    for (const hash of clientHashes.sort()) {
      hasher.update("\n");
      hasher.update(hash);
    }
    baseHashes.set(component, hasher.digest("hex"));
  }
}
function collectContentEntryHashes(graph, root) {
  const entryHashes = /* @__PURE__ */ new Map();
  for (const id of graph.getModuleIds()) {
    if (!hasContentFlag(id, PROPAGATED_ASSET_FLAG)) continue;
    const renderModuleId = removeQueryString(id);
    const key = rootRelativePath(root, renderModuleId, false);
    const deps = collectTransitiveDeps(graph, renderModuleId);
    entryHashes.set(key, hashModules(graph, deps));
  }
  return entryHashes;
}
function pageContainsServerIsland(graph, ids) {
  for (const id of ids) {
    const serverComponents = graph.getModuleInfo(id)?.meta?.astro?.serverComponents;
    if (serverComponents?.length) return true;
  }
  return false;
}
function pluginIncremental(internals, root) {
  return {
    name: "@astro/plugin-incremental",
    applyToEnvironment(environment) {
      return environment.name === ASTRO_VITE_ENVIRONMENT_NAMES.prerender || environment.name === ASTRO_VITE_ENVIRONMENT_NAMES.client;
    },
    generateBundle() {
      if (this.environment?.name === ASTRO_VITE_ENVIRONMENT_NAMES.client) {
        foldClientDependencies(this, internals);
        return;
      }
      const hashes = /* @__PURE__ */ new Map();
      const serverIslandComponents = /* @__PURE__ */ new Set();
      for (const id of this.getModuleIds()) {
        const info = this.getModuleInfo(id);
        if (!info) continue;
        if (!moduleIsTopLevelPage(info)) continue;
        const pageData = getPageDataByViteID(internals, info.id);
        if (!pageData) continue;
        const deps = collectTransitiveDeps(this, info.id);
        hashes.set(pageData.component, hashModules(this, deps));
        if (pageContainsServerIsland(this, deps)) {
          serverIslandComponents.add(pageData.component);
        }
      }
      internals.pageDependencyHashes = hashes;
      internals.contentEntryRenderHashes = collectContentEntryHashes(this, root);
      internals.serverIslandPageComponents = serverIslandComponents;
    }
  };
}
export {
  pluginIncremental
};
