// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import AdminTable from "./AdminTable2.jsx";
import AdminLegend from "./AdminLegend.jsx";
import { supabase } from "../../lib/supabase.js";

export default function AdminDashboard({ onNavigate }) {
  AdminDashboard.propTypes = {
    onNavigate: PropTypes.func.isRequired,
  };

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const table = import.meta.env.VITE_SUBMISSIONS_TABLE || "cg_submissions";
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order("ts", { ascending: false });

        if (error) throw error;
        setSubmissions(data || []);
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
        // Fallback to localStorage
        try {
          const localSubs = JSON.parse(localStorage.getItem("cg_submissions_v1") || "[]");
          setSubmissions(localSubs);
        } catch (e) {
          console.error("Failed to load local submissions:", e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const handleViewSubmission = (submission) => {
    // Navigate to results with submission data
    onNavigate("results", { submission });
  };

  const handleDeleteSubmission = async (submission) => {
    try {
      const ok = window.confirm("Delete this submission? This cannot be undone.");
      if (!ok) return;
      const table = import.meta.env.VITE_SUBMISSIONS_TABLE || "cg_submissions";
      const { error } = await supabase.from(table).delete().eq("id", submission.id);
      if (error) throw error;
      setSubmissions((rows) => rows.filter((r) => r.id !== submission.id));
    } catch (e) {
      console.error("Failed to delete submission:", e);
      alert("Failed to delete submission. Please try again.");
    }
  };


  return (
    <PageWrap>
      <HeaderBar title="Test Submissions" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>Recent Test Submissions</h3>
        <AdminLegend />
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading test submissions...</p>
        ) : (
          <AdminTable submissions={submissions} onViewSubmission={handleViewSubmission} onDeleteSubmission={handleDeleteSubmission} />
        )}
        <div style={{ marginTop: 16 }}>
          <Btn variant="back" onClick={() => onNavigate("home")}>Back to Home</Btn>
        </div>
      </Card>
    </PageWrap>
  );
}


