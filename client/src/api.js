import { supabase } from "./lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function request(path, options = {}) {
  const token = await getToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "요청 처리 중 오류가 발생했습니다.");
  }

  return payload;
}

export const api = {
  getWorkspace() {
    return request("/workspace");
  },

  getProjects() {
    return request("/projects");
  },

  getTasks(projectId = "all") {
    return request(`/tasks?project_id=${encodeURIComponent(projectId)}`);
  },

  updateTask(taskId, payload) {
    return request(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  importExcel(file) {
    const formData = new FormData();
    formData.append("file", file);

    return request("/import/excel", {
      method: "POST",
      body: formData,
    });
  },

  generateAi(text) {
    return request("/ai/generate", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  getMessages(projectId) {
    return request(`/messages?project_id=${encodeURIComponent(projectId)}`);
  },

  sendMessage(projectId, body) {
    return request("/messages", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, body }),
    });
  },

  getMembers() {
    return request("/members");
  },

  addMember(email, role = "member", displayName = "") {
    return request("/members", {
      method: "POST",
      body: JSON.stringify({
        email,
        role,
        display_name: displayName,
      }),
    });
  },

  getProfile() {
    return request("/profile");
  },

  updateProfile(payload) {
    return request("/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};