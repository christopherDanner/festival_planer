import streamlit as st
import pandas as pd

st.set_page_config(page_title="Personaleinteilung", layout="wide")
st.title("🎶 Musikverein – Personaleinteilung")

uploaded = st.file_uploader("📂 Lade deine Einteilungs-Excel hoch", type=["xlsx"])

if uploaded:
    # Lade das Blatt "Übersicht"
    df = pd.read_excel(uploaded, sheet_name="Übersicht")

    st.subheader("📌 Bearbeite hier direkt die Einteilung")
    edited_df = st.data_editor(
        df,
        num_rows="dynamic",
        use_container_width=True
    )

    st.subheader("📋 Vorschau deiner aktuellen Einteilung")
    st.dataframe(edited_df, use_container_width=True)

    # Export
    if st.button("📥 Exportieren als Excel"):
        out_path = "Neue-Einteilung.xlsx"
        edited_df.to_excel(out_path, index=False)
        st.success(f"✅ Datei '{out_path}' gespeichert (liegt im Arbeitsverzeichnis der App).")
else:
    st.info("Bitte lade zuerst deine Datei 'Fest-Personaleinteilung.xlsx' hoch.")
