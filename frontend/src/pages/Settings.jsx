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
  Eye,
  EyeOff
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
  const { user, updateUser, fetchUserProfile } = useAuth();

  // Layout & UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSetting, setActiveSetting] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [profilepopup, setProfilePopup] = useState(false);

  // Profile Form States
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    bio: "",
  });

  // Settings Object State (Fixed missing definitions)
  const [settingsData, setSettingsData] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      courseUpdates: true,
      discussionReplies: true,
    },
    appearance: {
      language: i18n.language || "en",
    },
    security: {
      twoFactorAuth: false,
      loginAlerts: true,
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [originalNotifications, setOriginalNotifications] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        bio: user.bio || "",
      });
      setOriginalNotifications(settingsData.notifications);
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
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-alt flex flex-col">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Container wrapper for Sidebar + Main Content */}
      <div className="flex flex-1 relative mt-16">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          activePage="settings"
        />

        <main 
          className={`flex-1 transition-all duration-300 min-h-screen ${
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-80"
          }`}
        >
          <div className="p-4 sm:p-8 max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8">
              
              {/* Settings Sub-Nav Aside */}
              <aside className="w-full lg:w-72 shrink-0">
                <nav className="bg-card rounded-3xl shadow-sm border border-border p-3 sticky top-24">
                  <div className="space-y-1">
                    {NAV_KEYS.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.key}
                          onClick={() => setActiveSetting(item.key)}
                          className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all ${
                            activeSetting === item.key 
                              ? "bg-teal-500/10 text-teal-500 font-bold" 
                              : "text-muted hover:bg-canvas-alt"
                          }`}
                        >
                          <IconComponent className={`w-5 h-5 ${activeSetting === item.key ? "text-teal-500" : "text-[#00BEA5]"}`} />
                          <span className="text-[15px]">{t(item.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </nav>
              </aside>

              {/* Main Settings Form Area */}
              <div className="flex-1">
                {activeSetting === "profile" && (
                  <div className="animate-in fade-in duration-500">
                    <div className="mb-8 ml-1">
                      <h1 className="text-3xl font-extrabold text-main">{t("settings.profile.title")}</h1>
                      <p className="text-muted mt-1">{t("settings.profile.subtitle")}</p>
                    </div>

                    <div className="bg-card rounded-3xl border border-border shadow-sm p-8">
                      <div className="flex flex-col md:flex-row gap-10">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="relative">
                            <img
                              src={removeAvatar ? `https://api.dicebear.com/8.x/initials/svg?seed=${formData.firstName}` : (avatarFile ? URL.createObjectURL(avatarFile) : (user?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${formData.firstName}`))}
                              alt="Profile"
                              className="w-36 h-36 rounded-full border-4 border-teal-500/20 object-cover shadow-xl"
                            />
                            <label className="absolute bottom-1 right-1 w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors shadow-lg">
                              <Camera className="w-5 h-5" />
                              <input type="file" accept="image/*" hidden onChange={(e) => {setAvatarFile(e.target.files[0]); setRemoveAvatar(false);}} />
                            </label>
                          </div>
                          <div className="mt-4 text-center">
                            <h2 className="text-xl font-bold text-main">{formData.firstName} {formData.lastName}</h2>
                            {(user?.avatar_url || avatarFile) && !removeAvatar && (
                              <button onClick={handleRemovePhoto} className="mt-2 flex items-center gap-2 text-red-500 text-sm font-semibold hover:underline">
                                <Trash2 className="w-4 h-4" /> {t("Remove Photo")}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Form Inputs */}
                        <div className="flex-1 space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2 relative">
                              <label className="text-sm font-bold text-muted ml-1">{t("settings.profile.first_name")}</label>
                              <input type="text" value={formData.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border bg-input text-main focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-2 relative">
                              <label className="text-sm font-bold text-muted ml-1">{t("settings.profile.last_name")}</label>
                              <input type="text" value={formData.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border bg-input text-main focus:ring-2 focus:ring-teal-500 outline-none transition-all" />
                            </div>
                          </div>
                          <div className="space-y-2 relative">
                            <label className="text-sm font-bold text-muted ml-1">{t("settings.profile.email")}</label>
                            <input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} className="w-full h-12 px-4 rounded-xl border border-border bg-input text-main focus:ring-2 focus:ring-teal-500 outline-none" />
                          </div>
                          <div className="space-y-2 relative">
                            <label className="text-sm font-bold text-muted ml-1">{t("settings.profile.bio")}</label>
                            <textarea value={formData.bio} onChange={(e) => handleInputChange("bio", e.target.value)} className="w-full min-h-[120px] p-4 rounded-xl border border-border bg-input text-main resize-none focus:ring-2 focus:ring-teal-500 outline-none" />
                          </div>
                          <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button className="px-6 py-3 rounded-xl border border-border font-bold hover:bg-canvas-alt transition-colors">{t("common.cancel")}</button>
                            <button onClick={handleSaveChanges} disabled={loading} className="px-8 py-3 rounded-xl bg-teal-500 text-white font-bold hover:bg-teal-600 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/20">
                              {loading ? t("common.saving") : t("common.save_changes")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* ... other sections logic ... */}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Success Popup */}
      {profilepopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-card rounded-[40px] p-10 w-full max-w-sm text-center shadow-2xl border border-border animate-in zoom-in-95 duration-300">
            <div className="mx-auto mb-6 w-20 h-20 flex items-center justify-center rounded-full bg-teal-500 text-white text-4xl shadow-lg shadow-teal-500/40">✓</div>
            <h2 className="text-2xl font-black text-main mb-2">{t("settings.profile.updated")}</h2>
            <button onClick={() => setProfilePopup(false)} className="w-full py-4 bg-teal-500 text-white rounded-2xl font-bold hover:bg-teal-600 transition-all shadow-lg">
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
