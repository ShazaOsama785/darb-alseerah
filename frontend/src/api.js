const ok = (r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); };
const post = (u, body) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(ok);

export const getChapters = () => fetch("/api/chapters").then(ok);
export const getChapter = (id) => fetch(`/api/chapters/${id}`).then(ok);
export const postCheck = (event_id, user_answer) => post("/api/check", { event_id, user_answer });
export const postChat = (payload) => post("/api/chat", payload);
