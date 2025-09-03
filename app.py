import streamlit as st
import pandas as pd
from streamlit_drag_and_drop_lists import dnd_list

st.set_page_config(page_title="Personaleinteilung", layout="wide")
st.title("🎶 Musikverein – Personaleinteilung")

uploaded = st.file_uploader("📂 Lade deine Einteilungs-Excel hoch", type=["xlsx"])

if uploaded:
    # Lade das Blatt "Übersicht"
    df = pd.read_excel(uploaded, sheet_name="Übersicht")
    # Alle Spalten außer leere
    stationen = [c for c in df.columns if "Unnamed" not in c and str(c).strip() != ""]

    # Session State initialisieren
    if "zuordnung" not in st.session_state:
        st.session_state["zuordnung"] = {s: df[s].dropna().astype(str).tolist() for s in stationen}

    st.subheader("📌 Drag & Drop Einteilung")
    cols = st.columns(len(stationen))
    for i, station in enumerate(stationen):
        with cols[i]:
            st.markdown(f"### {station}")
            result = dnd_list(st.session_state["zuordnung"][station], key=f"station_{i}")
            st.session_state["zuordnung"][station] = result

    # Export
    if st.button("📥 Exportieren als Excel"):
        max_len = max(len(v) for v in st.session_state["zuordnung"].values())
        data = {s: st.session_state["zuordnung"][s] + [""]*(max_len-len(st.session_state["zuordnung"][s]))
                for s in stationen}
        out = pd.DataFrame(data)
        out.to_excel("Neue-Einteilung.xlsx", index=False)
        st.success("✅ Datei 'Neue-Einteilung.xlsx' gespeichert! (liegt im Arbeitsverzeichnis)")
else:
    st.info("Bitte zuerst eine Excel-Datei hochladen (z. B. Fest-Personaleinteilung.xlsx)")
