import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import { useTranslation } from "react-i18next";
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  RefreshCw,
  X,
  Send,
  Smile,
  Flag,
  Users,
  BookOpen,
  ChevronDown,
  ArrowRight,
  MoreVertical,
  Clock,
} from "lucide-react";

/* ───────── helpers ───────── */
const getRelativeTime = (dateStr) => {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
};

const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "?");

const avatarColors = [
  "bg-purple-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-orange-500",
  "bg-pink-600",
  "bg-cyan-600",
  "bg-green-600",
  "bg-red-500",
];
const pickColor = (str) => {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++)
    h = str.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
};

const GLOBAL_CATEGORIES = [
  "Course Discussion",
  "General",
  "Help & Support",
  "Feedback",
  "Off-Topic",
];

const CATEGORY_KEY_MAP = {
  "Course Discussion": "cat_course_discussion",
  General: "cat_general",
  "Help & Support": "cat_help_support",
  Feedback: "cat_feedback",
  "Off-Topic": "cat_off_topic",
};

const categoryColorMap = {
  "Course Discussion": "border-purple-500 text-purple-400",
  General: "border-blue-500 text-blue-400",
  "Help & Support": "border-green-500 text-green-400",
  Feedback: "border-yellow-500 text-yellow-400",
  "Off-Topic": "border-gray-500 text-gray-400",
};

const DiscussionsPage = () => {
  const { t } = useTranslation();
  const getCategoryLabel = (cat) =>
    t(`discussions.${CATEGORY_KEY_MAP[cat]}`, cat);
  const { user } = useAuth();
  const { sidebarCollapsed } = useSidebar();
  const token = localStorage.getItem("token");

  /* ── top-level state ── */
  const [activeView, setActiveView] = useState("courseCommunity");

  /* ── course community state ── */
  const [coursePosts, setCoursePosts] = useState([]);
  const [coursePostsLoading, setCoursePostsLoading] = useState(false);
  const [courseSort, setCourseSort] = useState("Recent");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [panelPosts, setPanelPosts] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelSort, setPanelSort] = useState("Recent");
  const [panelReplyText, setPanelReplyText] = useState("");
  const [allCourses, setAllCourses] = useState([]);

  /* ── global community state ── */
  const [globalPosts, setGlobalPosts] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalSort, setGlobalSort] = useState("Recent");
  const [globalCategoryFilter, setGlobalCategoryFilter] =
    useState("All Categories");
  const [globalContent, setGlobalContent] = useState("");
  const [globalCategory, setGlobalCategory] = useState("");
  const [expandedGlobalPost, setExpandedGlobalPost] = useState(null);
  const [globalReplyText, setGlobalReplyText] = useState("");

  const panelRef = useRef(null);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchAllCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.popularCourses || data.courseCards || data || [];
      setAllCourses(Array.isArray(list) ? list : []);
    } catch { /* ignore */ }
  }, [token]);

  const fetchCoursePosts = useCallback(
    async (sort) => {
      setCoursePostsLoading(true);
      try {
        const q = sort === "Popular" ? "?sort=popular" : "";
        const res = await fetch(`/api/community/course-posts${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        setCoursePosts(await res.json());
      } catch {
        setCoursePosts([]);
      } finally {
        setCoursePostsLoading(false);
      }
    },
    [token]
  );

  const fetchPanelPosts = useCallback(
    async (courseId, sort) => {
      setPanelLoading(true);
      try {
        const q = sort === "Popular" ? "?sort=popular" : "";
        const res = await fetch(`/api/community/course/${courseId}${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        setPanelPosts(await res.json());
      } catch {
        setPanelPosts([]);
      } finally {
        setPanelLoading(false);
      }
    },
    [token]
  );

  const fetchGlobalPosts = useCallback(
    async (cat, sort) => {
      setGlobalLoading(true);
      try {
        const params = new URLSearchParams();
        if (cat && cat !== "All Categories") params.set("category", cat);
        if (sort === "Popular") params.set("sort", "popular");
        const res = await fetch(`/api/community/global?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        setGlobalPosts(await res.json());
      } catch {
        setGlobalPosts([]);
      } finally {
        setGlobalLoading(false);
      }
    },
    [token]
  );

  const createPost = async (body) => {
    const res = await fetch("/api/community", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to create post");
    return res.json();
  };

  const doAction = async (id, action, body) => {
    const method = action === "reply" ? "POST" : "PUT";
    const res = await fetch(`/api/community/${id}/${action}`, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error();
    return res.json();
  };

  useEffect(() => { fetchAllCourses(); }, [fetchAllCourses]);

  useEffect(() => {
    if (activeView === "courseCommunity") fetchCoursePosts(courseSort);
  }, [activeView, courseSort, fetchCoursePosts]);

  useEffect(() => {
    if (activeView === "global")
      fetchGlobalPosts(globalCategoryFilter, globalSort);
  }, [activeView, globalCategoryFilter, globalSort, fetchGlobalPosts]);

  useEffect(() => {
    if (selectedCourse) fetchPanelPosts(selectedCourse.courseId, panelSort);
  }, [selectedCourse, panelSort, fetchPanelPosts]);

  const handleLike = async (postId, source) => {
    try {
      const updated = await doAction(postId, "like");
      patchPost(updated, source);
    } catch { /* ignore */ }
  };

  const handleDislike = async (postId, source) => {
    try {
      const updated = await doAction(postId, "dislike");
      patchPost(updated, source);
    } catch { /* ignore */ }
  };

  const handleReplySubmit = async (postId, text, source) => {
    if (!text.trim()) return;
    try {
      const updated = await doAction(postId, "reply", { text });
      patchPost(updated, source);
    } catch { /* ignore */ }
  };

  const patchPost = (updated, source) => {
    const replace = (list) =>
      list.map((p) => (p.id === updated.id ? updated : p));
    if (source === "courseGrid") setCoursePosts(replace);
    if (source === "panel") setPanelPosts(replace);
    if (source === "global") setGlobalPosts(replace);
  };

  const handlePanelPost = async (text) => {
    if (!text.trim() || !selectedCourse) return;
    try {
      const newPost = await createPost({
        type: "course",
        courseId: selectedCourse.courseId,
        courseName: selectedCourse.courseName,
        content: text,
      });
      setPanelPosts((prev) => [newPost, ...prev]);
      setCoursePosts((prev) => [newPost, ...prev]);
      setPanelReplyText("");
    } catch { /* ignore */ }
  };

  const handleGlobalPost = async (e) => {
    e.preventDefault();
    if (!globalContent.trim() || !globalCategory) return;
    try {
      const newPost = await createPost({
        type: "global",
        category: globalCategory,
        content: globalContent,
      });
      setGlobalPosts((prev) => [newPost, ...prev]);
      setGlobalContent("");
      setGlobalCategory("");
    } catch { /* ignore */ }
  };

  const courseNameForPost = (post) => post.courseName || `Course #${post.courseId}`;

  return (
    <div className="min-h-screen bg-canvas-alt flex flex-col">
      <Header />
      <Sidebar activePage="discussions" />

      <div className={`flex-1 flex flex-col transition-all duration-300 mt-10 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-80"}`}>
        
        {/* HERO SECTION */}
        <div className="relative overflow-hidden bg-linear-to-br from-teal-700 via-teal-600 to-teal-800 pt-16 pb-12 px-4 sm:px-8">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
              {activeView === "courseCommunity" ? (
                <>
                  {t("discussions.course_communities").split(" ")[0]}{" "}
                  <span className="text-yellow-400">{t("discussions.course_communities").split(" ").slice(1).join(" ")}</span>
                </>
              ) : (
                <span className="text-orange-400">
                  {t("discussions.global_title")}
                </span>
              )}
            </h1>
            <p className="text-teal-100 text-sm sm:text-base max-w-xl mx-auto">{t("discussions.global_subtitle")}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setActiveView("courseCommunity")} className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${activeView === "courseCommunity" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-black/30 text-white hover:bg-black/40"}`}> <BookOpen className="w-4 h-4" /> {t("discussions.course_communities")} </button>
              <button onClick={() => setActiveView("global")} className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${activeView === "global" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-black/30 text-white hover:bg-black/40"}`}> <Users className="w-4 h-4" /> {t("discussions.global_btn")} </button>
            </div>
          </div>
        </div>

        {/* BODY SECTION */}
        <div className="flex-1 flex relative">
          {activeView === "courseCommunity" && (
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
              <div className={`max-w-5xl mx-auto ${selectedCourse ? "xl:mr-105" : ""}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-xl font-bold text-main">
                      {t("discussions.recent")}{" "}
                      <span className="text-muted font-normal text-base">({coursePosts.length})</span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted" />
                    {["Recent", "Popular"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setCourseSort(s)}
                        className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                          courseSort === s
                            ? "bg-red-500 text-white"
                            : "bg-card border border-border text-muted hover:text-main"
                        }`}
                      >
                        {s === "Recent" ? t("discussions.sort_recent") : t("discussions.sort_popular")}
                      </button>
                    ))}
                  </div>
                </div>

                {coursePostsLoading ? (
                  <div className="text-center py-12 text-muted">{t("discussions.loading")}</div>
                ) : coursePosts.length === 0 ? (
                  <div className="text-center py-12 text-muted">
                    {t("discussions.no_course")}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allCourses.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCourse({ courseId: c.id, courseName: c.title })}
                          className="bg-card border border-border rounded-xl p-4 text-left hover:border-indigo-500 transition-colors"
                        >
                          <h3 className="font-semibold text-main">{c.title}</h3>
                          <p className="text-xs text-muted mt-1">{c.category}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {coursePosts.map((post) => (
                        <div 
                          key={post.id} 
                          onClick={() => setSelectedCourse({ courseId: post.courseId, courseName: courseNameForPost(post) })} 
                          className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-indigo-500/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${pickColor(post.author?.name)}`}> 
                              {getInitial(post.author?.name)} 
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap"> 
                                <span className="font-semibold text-main text-sm">{post.author?.name || "Unknown"}</span> 
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-600 text-white truncate max-w-35">{courseNameForPost(post)}</span> 
                              </div>
                              <span className="text-xs text-muted">{getRelativeTime(post.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8">
                      <h3 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
                        {t("discussions.start_in_course")}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {allCourses.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCourse({ courseId: c.id, courseName: c.title })}
                            className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-main hover:border-indigo-500 transition-colors"
                          >
                            {c.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {selectedCourse && (
                <div
                  ref={panelRef}
                  className="fixed top-0 right-0 h-full w-full sm:w-100 bg-card border-l border-border shadow-2xl z-50 flex flex-col"
                >
                  <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-main">Community</h3>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {selectedCourse.courseName} &bull; {panelPosts.length} messages
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => fetchPanelPosts(selectedCourse.courseId, panelSort)} className="p-1.5 rounded-lg hover:bg-canvas-alt text-muted"><RefreshCw className="w-4 h-4" /></button>
                      <button onClick={() => setSelectedCourse(null)} className="p-1.5 rounded-lg hover:bg-canvas-alt text-muted"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="flex border-b border-border shrink-0">
                    {["Recent", "Popular"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setPanelSort(s)}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${panelSort === s ? "bg-indigo-600/10 text-indigo-500 border-b-2 border-indigo-500" : "text-muted hover:text-main"}`}
                      >
                        {s === "Recent" ? <Clock className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                        {s === "Recent" ? t("discussions.sort_recent") : t("discussions.sort_popular")}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {panelLoading ? (
                      <div className="text-center py-8 text-muted text-sm">{t("common.loading")}</div>
                    ) : (
                      panelPosts.map((post) => (
                        <div key={post.id} className="space-y-2">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${pickColor(post.author?.name)}`}> {getInitial(post.author?.name)} </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap"> <span className="font-semibold text-main text-sm">{post.author?.name || "Unknown"}</span> <span className="text-[11px] text-muted">{getRelativeTime(post.createdAt)}</span> </div>
                              </div>
                              <p className="text-sm text-muted mt-1">{post.content}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                                <button onClick={() => handleLike(post.id, "panel")} className={`flex items-center gap-1 ${post.likes?.some(l => l.userId === user?.id) ? "text-indigo-500" : ""}`}><ThumbsUp className="w-3.5 h-3.5" /> {post.likes?.length || 0}</button>
                                <button onClick={() => handleDislike(post.id, "panel")} className={`flex items-center gap-1 ${post.dislikes?.some(d => d.userId === user?.id) ? "text-red-500" : ""}`}><ThumbsDown className="w-3.5 h-3.5" /> {post.dislikes?.length || 0}</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-border shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={t("discussions.share_thoughts")}
                        value={panelReplyText}
                        onChange={(e) => setPanelReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePanelPost(panelReplyText)}
                        className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button onClick={() => handlePanelPost(panelReplyText)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> {t("discussions.send")}</button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          )}

          {activeView === "global" && (
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-linear-to-r from-red-900/30 to-orange-900/30 border border-orange-500/30 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0"> <Users className="w-6 h-6 text-white" /> </div>
                    <div>
                      <h3 className="font-bold text-main text-lg">{t("discussions.welcome_global")}</h3>
                      <p className="text-muted text-sm mt-1">{t("discussions.connect_text")}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleGlobalPost} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${pickColor(user?.name)}`}> {getInitial(user?.name)} </div>
                    <textarea
                      value={globalContent}
                      onChange={(e) => setGlobalContent(e.target.value)}
                      placeholder={t("discussions.post_placeholder")}
                      rows={4}
                      className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-sm text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
                    <select
                      value={globalCategory}
                      onChange={(e) => setGlobalCategory(e.target.value)}
                      className="appearance-none px-3 py-2 bg-input border border-border rounded-lg text-sm text-muted focus:outline-none cursor-pointer"
                    >
                      <option value="">{t("discussions.select_category")}</option>
                      {GLOBAL_CATEGORIES.map((c) => ( <option key={c} value={c}>{getCategoryLabel(c)}</option> ))}
                    </select>
                    <button type="submit" disabled={!globalContent.trim() || !globalCategory} className="px-6 py-2.5 bg-linear-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"><Send className="w-4 h-4" /> {t("discussions.post_btn")}</button>
                  </div>
                </form>

                <div className="space-y-4">
                  {globalLoading ? (
                    <div className="text-center py-12 text-muted">{t("discussions.loading")}</div>
                  ) : (
                    globalPosts.map((post) => (
                      <div key={post.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${pickColor(post.author?.name)}`}> {getInitial(post.author?.name)} </div>
                            <div>
                              <div className="font-semibold text-main text-sm">{post.author?.name || "Unknown"}</div>
                              <div className="text-xs text-muted">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}</div>
                            </div>
                          </div>
                          {post.category && ( <span className={`px-3 py-1 rounded-full text-xs font-medium border ${categoryColorMap[post.category] || "border-gray-500 text-gray-400"}`}> {post.category} </span> )}
                        </div>
                        <p className="text-sm text-muted mb-4">{post.content}</p>
                        <div className="border-t border-border pt-3 flex items-center justify-between">
                          <div className="flex items-center gap-5 text-xs text-muted">
                            <button onClick={() => handleLike(post.id, "global")} className={`flex items-center gap-1 ${post.likes?.some(l => l.userId === user?.id) ? "text-indigo-500" : ""}`}><ThumbsUp className="w-3.5 h-3.5" /> {post.likes?.length || 0}</button>
                            <button onClick={() => handleDislike(post.id, "global")} className={`flex items-center gap-1 ${post.dislikes?.some(d => d.userId === user?.id) ? "text-red-500" : ""}`}><ThumbsDown className="w-3.5 h-3.5" /> {post.dislikes?.length || 0}</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscussionsPage;