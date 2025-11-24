"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";
import {
  formatAddress,
  formatPhone,
  findSimilarCity,
  popularCities,
  safeValue,
} from "../lib/utils";
import type { Lead, DashboardResponse } from "../types/lead";

const categories: Array<{ value: string; label: string }> = [
  { value: "coffee", label: "Coffee shops" },
  { value: "restaurant", label: "Restaurants" },
  { value: "bar", label: "Bars & pubs" },
  { value: "hair", label: "Hairdressers" },
  { value: "pharmacy", label: "Pharmacies" },
];

const defaultForm = {
  city: "",
  category: "coffee",
  limit: 10,
  offset: 0,
};

const webhookUrl =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK ??
  "http://localhost:5678/webhook/lead-generation";

export default function Home() {
  const [form, setForm] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasResults = leads.length > 0;

  const formattedTotal = useMemo(() => {
    if (total === null) {
      return "—";
    }
    return total.toLocaleString();
  }, [total]);

  const updateForm =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        field === "limit" || field === "offset"
          ? Number(event.target.value)
          : event.target.value;

      setForm((prev) => {
        const updated = {
          ...prev,
          [field]: value,
        };

        // City autocomplete
        if (field === "city" && typeof value === "string") {
          const input = value.toLowerCase().trim();
          if (input.length > 0) {
            const matches = popularCities.filter((city) =>
              city.toLowerCase().startsWith(input)
            );
            setCitySuggestions(matches.slice(0, 5));
            setShowSuggestions(matches.length > 0);
          } else {
            setCitySuggestions([]);
            setShowSuggestions(false);
          }
        }

        return updated;
      });
    };

  const selectCity = (city: string) => {
    setForm((prev) => ({ ...prev, city }));
    setCitySuggestions([]);
    setShowSuggestions(false);
  };

  const resetResults = () => {
    setLeads([]);
    setTotal(null);
    setLastQuery(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedCity = form.city.trim();
    if (!trimmedCity) {
      setError("Please enter a city before searching.");
      return;
    }

    setError(null);
    setIsLoading(true);

    const payload = {
      city: trimmedCity,
      category: form.category,
      limit: Math.max(1, Math.min(form.limit || 10, 100)),
      offset: Math.max(0, form.offset || 0),
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: DashboardResponse | null = null;
      let fallbackBody: string | null = null;
      try {
        data = (await response.json()) as DashboardResponse;
      } catch {
        try {
          fallbackBody = await response.text();
        } catch {
          fallbackBody = null;
        }
      }

      if (!response.ok || !data?.success) {
        const message = (() => {
          if (data) {
            if (Array.isArray(data.message)) {
              return data.message.join(", ");
            }
            return data.error ?? data.message ?? "Unable to fetch leads.";
          }
          return fallbackBody ?? "Unable to fetch leads.";
        })();

        setError(message);
        resetResults();
        return;
      }

      const items = data.items ?? [];
      
      // Normalize field names (handle both lowercase and PascalCase from n8n)
      const normalizedItems: Lead[] = items.map((item: any) => {
        const rawPhone = item.phone ?? item.Phone ?? null;
        // Remove leading apostrophe (added by Google Sheets to prevent formula interpretation)
        const cleanPhone = rawPhone && typeof rawPhone === 'string' && rawPhone.startsWith("'") 
          ? rawPhone.slice(1) 
          : rawPhone;
        
        return {
          id: item.id ?? item.Id ?? null,
          name: item.name ?? item.Name ?? null,
          category: item.category ?? item.Category ?? null,
          city: item.city ?? item.City ?? null,
          street: item.street ?? item.Street ?? null,
          housenumber: item.housenumber ?? item.Housenumber ?? item["House Number"] ?? null,
          address: item.address ?? item.Address ?? null,
          phone: cleanPhone,
          website: item.website ?? item.Website ?? null,
          lat: item.lat ?? item.Lat ?? null,
          lon: item.lon ?? item.Lon ?? null,
          source: item.source ?? item.Source ?? null,
        };
      });
      
      // Handle empty results with suggestions
      if (normalizedItems.length === 0) {
        const suggestion = findSimilarCity(payload.city);
        if (suggestion && suggestion.toLowerCase() !== payload.city.toLowerCase()) {
          setError(
            `No results found for "${payload.city}". Did you mean "${suggestion}"? Try searching for that instead.`
          );
        } else {
          setError(
            `No results found for "${payload.city}". Please check the spelling or try a different city name.`
          );
        }
        resetResults();
        return;
      }

      setLeads(normalizedItems);
      setTotal(data.total ?? normalizedItems.length);
      setLastQuery(`${payload.city} • ${payload.category}`);
    } catch (err) {
      console.error("Failed to fetch leads", err);
      setError(
        "We could not reach the workflow. Confirm n8n is running and the webhook URL is reachable."
      );
      resetResults();
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!hasResults) {
      return;
    }

    const header = [
      "id",
      "name",
      "category",
      "city",
      "street",
      "housenumber",
      "address",
      "phone",
      "website",
      "lat",
      "lon",
      "source",
    ];

    const rows = leads.map((lead) => {
      // Use Lead type properties directly (already normalized)
      return [
        safeValue(lead.id),
        safeValue(lead.name),
        safeValue(lead.category),
        safeValue(lead.city),
        safeValue(lead.street),
        safeValue(lead.housenumber),
        safeValue(lead.address),
        safeValue(formatPhone(lead.phone)),
        safeValue(lead.website),
        safeValue(lead.lat),
        safeValue(lead.lon),
        safeValue(lead.source),
      ].join(",");
    });

    const csv = [header.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leads-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setForm(defaultForm);
    setError(null);
    resetResults();
  };


  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.badge}>Live data • n8n + Overpass API</span>
          <h1>Lead Generation Dashboard</h1>
          <p>
            Search real business listings in seconds. The n8n workflow validates
            your input, fetches data from Overpass, removes duplicates, and
            returns clean JSON ready for export or outreach.
          </p>
        </header>

        <main className={styles.main}>
          <section className={styles.panel}>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label htmlFor="city">City *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={form.city}
                      onChange={updateForm("city")}
                      onFocus={() => {
                        if (citySuggestions.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay to allow click on suggestion
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      placeholder="e.g. San Francisco"
                      autoComplete="off"
                      required
                    />
                    {showSuggestions && citySuggestions.length > 0 && (
                      <ul
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          marginTop: "4px",
                          backgroundColor: "rgba(30, 41, 59, 0.95)",
                          border: "1px solid rgba(148, 163, 184, 0.3)",
                          borderRadius: "8px",
                          listStyle: "none",
                          padding: "4px 0",
                          zIndex: 1000,
                          maxHeight: "200px",
                          overflowY: "auto",
                        }}
                      >
                        {citySuggestions.map((city) => (
                          <li
                            key={city}
                            onClick={() => selectCity(city)}
                            style={{
                              padding: "8px 16px",
                              cursor: "pointer",
                              color: "#e2e8f0",
                              fontSize: "0.95rem",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "rgba(99, 102, 241, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                          >
                            {city}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={updateForm("category")}
                  >
                    {categories.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="limit">Limit</label>
                  <input
                    id="limit"
                    name="limit"
                    type="number"
                    min={1}
                    max={100}
                    value={form.limit}
                    onChange={updateForm("limit")}
                  />
                  <span className={styles.hint}>
                    Maximum 100 per request. Start with 10–25 to keep responses
                    fast.
                  </span>
                </div>

                <div className={styles.field}>
                  <label htmlFor="offset">Offset</label>
                  <input
                    id="offset"
                    name="offset"
                    type="number"
                    min={0}
                    value={form.offset}
                    onChange={updateForm("offset")}
                  />
                  <span className={styles.hint}>
                    Use offset to paginate through larger result sets.
                  </span>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isLoading}
                >
                  {isLoading ? "Searching…" : "Search leads"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={downloadCsv}
                  disabled={!hasResults}
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={clearAll}
                >
                  Clear
                </button>
              </div>
            </form>

            {error && (
              <div role="alert" className={styles.error}>
                {error}
              </div>
            )}

            {lastQuery && (
              <div className={styles.summary}>
                <strong>Showing {leads.length} leads</strong>
                <span>
                  Total available reported by workflow: {formattedTotal} · Query
                  key: {lastQuery}
                </span>
                <span>
                  Webhook: <code>{webhookUrl}</code>
                </span>
              </div>
            )}
          </section>

          <section className={styles.results}>
            {isLoading ? (
              <div className={styles.loading} role="status">
                Looking for new leads…
              </div>
            ) : hasResults ? (
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Category</th>
                      <th scope="col">City</th>
                      <th scope="col">Address</th>
                      <th scope="col">Phone</th>
                      <th scope="col">Website</th>
                      <th scope="col">Coordinates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, index) => (
                      <tr key={lead.id ?? `lead-${index}`}>
                        <td>{lead.name ?? "—"}</td>
                        <td>{lead.category ?? "—"}</td>
                        <td>{lead.city ?? "—"}</td>
                        <td>{formatAddress(lead)}</td>
                        <td>{formatPhone(lead.phone)}</td>
                        <td>
                          {lead.website ? (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.link}
                            >
                              Visit
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {lead.lat && lead.lon
                            ? `${lead.lat.toFixed(5)}, ${lead.lon.toFixed(5)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.placeholder}>
                Submit a city and category to see results. The workflow cleans
                and deduplicates everything for you.
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
