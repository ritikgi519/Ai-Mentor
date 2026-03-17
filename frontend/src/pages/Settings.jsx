// frontend/src/pages/Settings.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Camera,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import i18n from "../i18n/index.js";

const NAV_KEYS = [
  { icon: User, key: "profile", labelKey: "settings.nav.profile" },
  { icon: Bell, key: "notifications", labelKey: "settings.nav.notifications" },
  { icon: Shield, key: "password_security", labelKey: "settings.nav.password_security" },
  { icon: Palette, key: "appearance", labelKey: "settings.nav.appearance" },
  { icon: Globe, key: "language", labelKey: "settings.nav.language" },
];

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSetting, setActiveSetting] = useState("profile");
  const { user, updateUser, fetchUserProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    bio: "",
  });

  const [loading, setLoading] = useState(false);
  const [profilepopup, setProfilePopup] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemovePhoto = () => {
    setAvatarFile(null); 
    setRemoveAvatar(true);
    toast.success("Photo selected for removal. Click Save to confirm.");
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const form = new FormData();
      form.append("firstName", formData.firstName);
      form.append("lastName", formData.lastName);
      form.append("email", formData.email);
      form.append("bio", formData.bio);

      if (removeAvatar) {
        form.append("removeAvatar", "true");
      } else if (avatarFile) {
        form.append("avatar", avatarFile);
      }

      const response = await axios.put("/api/users/profile", form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      updateUser(response.data);
      setAvatarFile(null);
      setRemoveAvatar(false);
      toast.success("Profile updated successfully!");
      setProfilePopup(true);
      await fetchUserProfile();
      
    } catch (error) {
      console.error("❌ Update failed:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-alt flex flex-col">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        activePage="settings"
      />

      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 mt-3 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-80"}`}>
        <div className="flex flex-1 mt-15">
          <aside className="w-[280px] bg-card rounded-[24px] shadow-lg m-6 mr-0">
            <nav className="p-6">
              <div className="space-y-2">
                {NAV_KEYS.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveSetting(item.key)}
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-left transition-colors ${
                        activeSetting === item.key ? "bg-teal-50 dark:bg-teal-900/20 text-main" : "text-muted hover:bg-canvas-alt"
                      }`}
                    >
                      <IconComponent className="w-4 h-4 text-[#00BEA5]" />
                      <span className="font-medium text-[16px] font-[Inter]">{t(item.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          <main className="flex-1 p-8 mt-5">
            {activeSetting === "profile" && (
              <div className="max-w-[896px]">
                <div className="mb-8">
                  <h1 className="text-[30px] font-bold text-main font-[Inter] mb-2">{t("settings.profile.title")}</h1>
                  <p className="text-[16px] text-muted font-[Inter]">{t("settings.profile.subtitle")}</p>
                </div>

                <div className="bg-card rounded-[24px] shadow-lg p-8">
                  <div className="flex gap-8 mb-8">
                    <div className="flex flex-col items-center">
                      <div className="relative mb-6">
                        <img
                          src={removeAvatar ? `https://api.dicebear.com/8.x/initials/svg?seed=${formData.firstName}` : (avatarFile ? URL.createObjectURL(avatarFile) : (user?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${formData.firstName}`))}
                          alt="Profile"
                          className="w-32 h-32 rounded-full border-4 border-teal-500/30 shadow-md object-cover"
                        />
                        <label className="absolute bottom-2 right-2 w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-slate-800 transition-colors">
                          <Camera className="w-[14px] h-[14px] text-white" />
                          <input type="file" accept="image/*" hidden onChange={(e) => {setAvatarFile(e.target.files[0]); setRemoveAvatar(false);}} />
                        </label>
                      </div>
                      
                      {(user?.avatar_url || avatarFile) && !removeAvatar && (
                        <button 
                          onClick={handleRemovePhoto}
                          className="flex items-center gap-2 text-red-500 text-sm font-medium hover:text-red-600 transition-colors mb-4"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t("Remove Photo")}
                        </button>
                      )}

                      <h2 className="text-[20px] font-semibold text-main">{formData.firstName} {formData.lastName}</h2>
                      <p className="text-[14px] text-muted mt-1">{t("common.premium_member")}</p>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="relative">
                          <label className="absolute -top-2 left-4 bg-card px-2 text-[14px] text-muted font-medium">{t("settings.profile.first_name")}</label>
                          <input type="text" value={formData.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} className="w-full h-[50px] px-4 rounded-xl border border-border bg-input text-main focus:ring-2 focus:ring-teal-500 outline-none" />
                        </div>
                        <div className="relative">
                          <label className="absolute -top-2 left-4 bg-card px-2 text-[14px] text-muted font-medium">{t("settings.profile.last_name")}</label>
                          <input type="text" value={formData.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} className="w-full h-[50px] px-4 rounded-xl border border-border bg-input text-main focus:ring-2 focus:ring-teal-500 outline-none" />
                        </div>
                      </div>

                      {/* 🔥 Email ID Box Added Here */}
                      <div className="relative">
                        <label className="absolute -top-2 left-4 bg-card px-2 text-[14px] text-muted font-medium">{t("settings.profile.email")}</label>
                        <input 
                          type="email" 
                          value={formData.email} 
                          onChange={(e) => handleInputChange("email", e.target.value)} 
                          className="w-full h-[50px] px-4 rounded-xl border border-border bg-input text-main focus:ring-2 focus:ring-teal-500 outline-none" 
                        />
                      </div>

                      <div className="relative">
                        <label className="absolute -top-2 left-4 bg-card px-2 text-[14px] text-muted font-medium">{t("settings.profile.bio")}</label>
                        <textarea value={formData.bio} onChange={(e) => handleInputChange("bio", e.target.value)} className="w-full min-h-[122px] px-4 py-3 rounded-xl border border-border bg-input text-main resize-none focus:ring-2 focus:ring-teal-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t border-border">
                    <button type="button" className="h-[50px] px-8 rounded-xl border border-border bg-card text-main font-semibold hover:bg-canvas-alt transition-colors">{t("common.cancel")}</button>
                    <button onClick={handleSaveChanges} disabled={loading} className="h-[50px] px-8 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-all disabled:opacity-50">
                      {loading ? t("common.saving") : t("common.save_changes")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {profilepopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 w-[420px] text-center shadow-2xl">
            <div className="mx-auto mb-6 w-20 h-20 flex items-center justify-center rounded-full bg-emerald-500 text-white text-4xl shadow-lg">✓</div>
            <h2 className="text-2xl font-bold text-emerald-500 mb-3">{t("settings.profile.updated")}</h2>
            <button onClick={() => setProfilePopup(false)} className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-semibold hover:bg-emerald-600 transition-colors shadow-md">
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}