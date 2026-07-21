import { lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";

const ScenarioStudioPage = lazy(() =>
  import("../features/studio/ScenarioStudioPage").then((module) => ({
    default: module.ScenarioStudioPage,
  })),
);
const VariablesPage = lazy(() =>
  import("../features/fixtures/VariablesPage").then((module) => ({
    default: module.VariablesPage,
  })),
);
const MacroListPage = lazy(() =>
  import("../features/fixtures/MacroListPage").then((module) => ({
    default: module.MacroListPage,
  })),
);
const RuleListPage = lazy(() =>
  import("../features/fixtures/RuleListPage").then((module) => ({
    default: module.RuleListPage,
  })),
);
const ProfileListPage = lazy(() =>
  import("../features/profiles/ProfileListPage").then((module) => ({
    default: module.ProfileListPage,
  })),
);
const RunCenterPage = lazy(() =>
  import("../features/runs/RunCenterPage").then((module) => ({
    default: module.RunCenterPage,
  })),
);
const ValidateCenterPage = lazy(() =>
  import("../features/validate/ValidateCenterPage").then((module) => ({
    default: module.ValidateCenterPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../features/config/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const BrowserRuntimePage = lazy(() =>
  import("../features/config/BrowserRuntimePage").then((module) => ({
    default: module.BrowserRuntimePage,
  })),
);
const ProjectsPage = lazy(() =>
  import("../features/projects/ProjectsPage").then((module) => ({
    default: module.ProjectsPage,
  })),
);
const ToolsHubPage = lazy(() =>
  import("../features/tools/ToolsHubPage").then((module) => ({
    default: module.ToolsHubPage,
  })),
);
const ToolHostPage = lazy(() =>
  import("../features/tools/ToolHostPage").then((module) => ({
    default: module.ToolHostPage,
  })),
);

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/scenarios" replace />} />
          <Route path="/scenarios" element={<ScenarioStudioPage />} />
          <Route path="/scenarios/*" element={<ScenarioStudioPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/browser" element={<BrowserRuntimePage />} />
          <Route path="/variables" element={<VariablesPage />} />
          <Route path="/macros" element={<MacroListPage />} />
          <Route path="/macros/*" element={<MacroListPage />} />
          <Route path="/rules" element={<RuleListPage />} />
          <Route path="/rules/*" element={<RuleListPage />} />
          <Route path="/profiles" element={<ProfileListPage />} />
          <Route path="/runs" element={<RunCenterPage />} />
          <Route path="/validate" element={<ValidateCenterPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/tools" element={<ToolsHubPage />} />
          <Route path="/tools/:toolId" element={<ToolHostPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/scenarios" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
