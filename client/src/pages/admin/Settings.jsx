import { useState } from "react"

const initialSettings = {
    profile: {
        name: "Admin User",
        email: "admin@company.com",
        role: "Administrator",
    },
    preferences: {
        theme: "light",
        language: "en",
        notifications: true,
        emailAlerts: true,
    },
    security: {
        twoFactor: false,
        sessionTimeout: 30,
    },
}

export default function Settings() {
    const [settings, setSettings] = useState(initialSettings)

    const updateProfile = (key, value) => {
        setSettings({
            ...settings,
            profile: { ...settings.profile, [key]: value },
        })
    }

    const updatePreferences = (key, value) => {
        setSettings({
            ...settings,
            preferences: { ...settings.preferences, [key]: value },
        })
    }

    const updateSecurity = (key, value) => {
        setSettings({
            ...settings,
            security: { ...settings.security, [key]: value },
        })
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
                <p className="text-sm text-slate-400 mt-1">
                    Manage your account and system preferences
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* PROFILE */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <h3 className="font-semibold text-sm text-slate-900">Profile</h3>

                    <div>
                        <label className="text-xs text-slate-500">Name</label>
                        <input
                            value={settings.profile.name}
                            onChange={(e) => updateProfile("name", e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500">Email</label>
                        <input
                            value={settings.profile.email}
                            onChange={(e) => updateProfile("email", e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-slate-500">Role</label>
                        <input
                            value={settings.profile.role}
                            disabled
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-slate-100"
                        />
                    </div>
                </div>

                {/* PREFERENCES */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <h3 className="font-semibold text-sm text-slate-900">Preferences</h3>

                    <div>
                        <label className="text-xs text-slate-500">Theme</label>
                        <select
                            value={settings.preferences.theme}
                            onChange={(e) => updatePreferences("theme", e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500">Language</label>
                        <select
                            value={settings.preferences.language}
                            onChange={(e) => updatePreferences("language", e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                        </select>
                    </div>

                    <label className="flex items-center justify-between text-sm">
                        Notifications
                        <input
                            type="checkbox"
                            checked={settings.preferences.notifications}
                            onChange={(e) =>
                                updatePreferences("notifications", e.target.checked)
                            }
                        />
                    </label>

                    <label className="flex items-center justify-between text-sm">
                        Email Alerts
                        <input
                            type="checkbox"
                            checked={settings.preferences.emailAlerts}
                            onChange={(e) =>
                                updatePreferences("emailAlerts", e.target.checked)
                            }
                        />
                    </label>
                </div>

                {/* SECURITY */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <h3 className="font-semibold text-sm text-slate-900">Security</h3>

                    <label className="flex items-center justify-between text-sm">
                        Two Factor Auth
                        <input
                            type="checkbox"
                            checked={settings.security.twoFactor}
                            onChange={(e) =>
                                updateSecurity("twoFactor", e.target.checked)
                            }
                        />
                    </label>

                    <div>
                        <label className="text-xs text-slate-500">
                            Session Timeout (minutes)
                        </label>
                        <input
                            type="number"
                            value={settings.security.sessionTimeout}
                            onChange={(e) =>
                                updateSecurity("sessionTimeout", e.target.value)
                            }
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        />
                    </div>

                    <button className="w-full mt-2 py-2 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600">
                        Reset Password
                    </button>
                </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-end">
                <button className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                    Save Changes
                </button>
            </div>
        </div>
    )
}