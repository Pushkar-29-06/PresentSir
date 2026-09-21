import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RouteGuards";
import { LoginPage } from "./pages/LoginPage";
import { RoleHome } from "./pages/RoleHome";
import { AppShell } from "./layouts/AppShell";
import { ThemeProvider } from "./theme/ThemeProvider";
import { FacultySessionsPage } from "./pages/faculty/FacultySessionsPage";
import { SmartBoardPage } from "./pages/faculty/SmartBoardPage";
import { FacultyReviewPage } from "./pages/faculty/FacultyReviewPage";
import "./theme/styles.css";
import { StudentAttendancePage } from "./pages/student/StudentAttendancePage";
import { StudentAnalyticsPage } from "./pages/student/StudentAnalyticsPage";
import { FacultyAnalyticsPage } from "./pages/faculty/FacultyAnalyticsPage";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(<StrictMode>
  <BrowserRouter><QueryClientProvider client={queryClient}><ThemeProvider><AuthProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth roles={["STUDENT"]} />}>
        <Route element={<AppShell role="Student" />}>
          <Route path="/student" element={<RoleHome role="Student" />} />
          <Route path="/student/attendance" element={<StudentAttendancePage />} />
          <Route path="/student/analytics" element={<StudentAnalyticsPage />} />
        </Route>
      </Route>
      <Route element={<RequireAuth roles={["FACULTY"]} />}>
        <Route element={<AppShell role="Faculty" />}>
          <Route path="/faculty" element={<RoleHome role="Faculty" />} />
          <Route path="/faculty/sessions" element={<FacultySessionsPage />} />
          <Route path="/faculty/sessions/:id/review" element={<FacultyReviewPage />} />
          <Route path="/faculty/analytics" element={<FacultyAnalyticsPage />} />
        </Route>
      </Route>
      <Route element={<RequireAuth roles={["FACULTY"]} />}><Route path="/faculty/sessions/:id/board" element={<SmartBoardPage />} /></Route>
      <Route element={<RequireAuth roles={["ADMIN"]} />}>
        <Route element={<AppShell role="Admin" />}>
          <Route path="/admin" element={<RoleHome role="Admin" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </AuthProvider></ThemeProvider></QueryClientProvider></BrowserRouter>
</StrictMode>);
