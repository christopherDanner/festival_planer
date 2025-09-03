import streamlit as st
import pandas as pd

st.set_page_config(page_title="Musikverein Personaleinteilung", layout="wide")
st.title("🎶 Musikverein – Personaleinteilung")

st.sidebar.header("📂 Daten hochladen")
uploaded_members = st.sidebar.file_uploader("Standesliste (Excel)", type=["xlsx"])
uploaded_assign = st.sidebar.file_uploader("Einteilung (Excel)", type=["xlsx"])

if uploaded_members:
    df_mitglieder = pd.read_excel(uploaded_members)

    if {"Vorname", "Nachname"}.issubset(df_mitglieder.columns):
        df_mitglieder["Mitglied"] = df_mitglieder["Vorname"].astype(str) + " " + df_mitglieder["Nachname"].astype(str)
    else:
        df_mitglieder["Mitglied"] = df_mitglieder.iloc[:,0].astype(str)

    st.subheader("👥 Mitgliederliste")
    st.dataframe(df_mitglieder[["Mitglied"]])

    if uploaded_assign:
        df_einteilung = pd.read_excel(uploaded_assign)

        st.subheader("📋 Eingeteilte Personen")
        st.dataframe(df_einteilung)

        st.subheader("📌 Übersicht pro Station")
        overview = df_einteilung.groupby("Station")["Name"].apply(list).reset_index()
        for _, row in overview.iterrows():
            st.markdown(f"**{row['Station']}**")
            for n in row["Name"]:
                st.write("–", n)

        eingeteilt = set(df_einteilung["Name"].dropna().astype(str))
        nicht_eingeteilt = [m for m in df_mitglieder["Mitglied"] if m not in eingeteilt]

        st.subheader("⚠️ Nicht eingeteilt")
        st.write(len(nicht_eingeteilt), "Person(en)")
        st.dataframe(pd.DataFrame(nicht_eingeteilt, columns=["Mitglied"]))

    else:
        st.info("Bitte auch eine Einteilungsdatei hochladen.")
else:
    st.warning("Bitte zuerst die Standesliste hochladen.")
