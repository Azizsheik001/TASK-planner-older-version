import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const UserContext = createContext({
  currentUser: null,
  loading: true,
  loginWithSupabase: async () => { },
  logout: () => { },
});

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading] = useState(false);

  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem("currentUser", JSON.stringify(currentUser));
      else localStorage.removeItem("currentUser");
    } catch { }
  }, [currentUser]);

  useEffect(() => {
    if (!supabase || typeof supabase.auth === "undefined") return;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    });

    return () => {
      if (authListener && authListener.unsubscribe) authListener.unsubscribe();
    };
  }, []);


  async function loginWithSupabase(email, password) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      const userObj = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role || "User",
        team_id: profile.team_id || null,
        sub_team_ids: profile.sub_team_ids || [],
        photo_url: profile.photo_url || null,
        department_id: profile.department_id || null
      };

      setCurrentUser(userObj);
      return userObj;
    } catch (err) {
      throw err;
    }
  }

  async function refreshUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && profile) {
        const userObj = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role || "User",
          team_id: profile.team_id || null,
          sub_team_ids: profile.sub_team_ids || [],
          photo_url: profile.photo_url || null,
          department_id: profile.department_id || null
        };
        setCurrentUser(userObj);
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
  }

  return (
    <UserContext.Provider value={{ currentUser, loading, loginWithSupabase, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
