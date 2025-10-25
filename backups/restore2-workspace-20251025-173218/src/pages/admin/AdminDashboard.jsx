// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { PageWrap, HeaderBar, Card } from "../../components/Layout.jsx";
import Btn from "../../components/Btn.jsx";
import AdminTable from "./AdminTable.jsx";
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
        const { data, error } = await supabase
          .from("submissions")
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

  return (
    <PageWrap>
      <HeaderBar title="Admin Dashboard" right={null} />
      <Card>
        <h3 style={{ marginTop: 0 }}>Submissions</h3>
        <AdminLegend />
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading submissions…</p>
        ) : (
          <AdminTable submissions={submissions} onViewSubmission={handleViewSubmission} />
        )}
        <div style={{ marginTop: 16 }}>
          <Btn variant="back" onClick={() => onNavigate("home")}>Back to Home</Btn>
        </div>
      </Card>
    </PageWrap>
  );
}
