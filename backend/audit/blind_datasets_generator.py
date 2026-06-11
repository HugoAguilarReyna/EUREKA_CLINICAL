import pandas as pd
import numpy as np
import os

def generate_blind_datasets():
    os.makedirs("blind_tests", exist_ok=True)
    n = 1000
    
    # S1: Multivariado (ALT alta y DB normal)
    df1 = pd.DataFrame({
        "Age": np.random.randint(20, 80, n), "Gender": np.random.choice(["Male", "Female"], n),
        "Sgpt": np.random.uniform(10, 100, n), "DB": np.random.uniform(0.1, 1.0, n)
    })
    # Enfermo si Sgpt > 70 AND DB < 0.5 (Interacción multivariada)
    df1["Selector"] = np.where((df1["Sgpt"] > 70) & (df1["DB"] < 0.5), 1, 2)
    df1.to_csv("blind_tests/scenario_1_multivariado.csv", index=False)

    # S2: Correlación invertida (Mientras MENOR es el marcador, MAYOR es el riesgo)
    df2 = pd.DataFrame({
        "Age": np.random.randint(20, 80, n), "Gender": np.random.choice(["Male", "Female"], n),
        "Marcador_Invertido": np.random.uniform(10, 100, n)
    })
    df2["Selector"] = np.where(df2["Marcador_Invertido"] < 30, 1, 2)
    df2.to_csv("blind_tests/scenario_2_inverted.csv", index=False)

    # S3: Bimodal (Riesgo solo en el medio, percentiles 25-75)
    df3 = pd.DataFrame({
        "Age": np.random.randint(20, 80, n), "Gender": np.random.choice(["Male", "Female"], n),
        "Marcador_Medio": np.random.uniform(0, 100, n)
    })
    df3["Selector"] = np.where((df3["Marcador_Medio"] > 40) & (df3["Marcador_Medio"] < 60), 1, 2)
    df3.to_csv("blind_tests/scenario_3_bimodal.csv", index=False)

    # S4: Variable Desconocida Dominante
    df4 = pd.DataFrame({
        "Age": np.random.randint(20, 80, n), "Gender": np.random.choice(["Male", "Female"], n),
        "TB": np.random.uniform(0, 2, n),
        "Marcador_X": np.random.uniform(0, 10, n) # Ruido excepto extremos
    })
    df4["Selector"] = np.where(df4["Marcador_X"] > 8.5, 1, 2)
    df4.to_csv("blind_tests/scenario_4_unknown.csv", index=False)

    # S5: Categórico puro
    df5 = pd.DataFrame({
        "Age": np.random.randint(20, 80, n), "Gender": np.random.choice(["Male", "Female"], n),
        "TB": np.random.uniform(0, 2, n),
    })
    # Riesgo ligado 100% al género (que el motor anterior excluía)
    df5["Selector"] = np.where(df5["Gender"] == "Female", 1, 2)
    df5.to_csv("blind_tests/scenario_5_categorical.csv", index=False)

    # S6: Interacción Cruzada (XOR logico)
    df6 = pd.DataFrame({
        "Age": np.random.randint(20, 80, n), "Gender": np.random.choice(["Male", "Female"], n),
        "VarA": np.random.uniform(0, 10, n), "VarB": np.random.uniform(0, 10, n)
    })
    df6["Selector"] = np.where(((df6["VarA"] > 5) & (df6["VarB"] < 5)) | ((df6["VarA"] < 5) & (df6["VarB"] > 5)), 1, 2)
    df6.to_csv("blind_tests/scenario_6_cross_interaction.csv", index=False)

    # S7: Riesgo Protector
    df7 = pd.DataFrame({
        "Age": np.random.randint(20, 80, n), "Gender": np.random.choice(["Male", "Female"], n),
        "Protector_Z": np.random.uniform(0, 100, n),
        "Riesgo_Base": np.random.uniform(0, 100, n)
    })
    # Si Riesgo_Base > 70 está enfermo, EXCEPTO si Protector_Z > 80 (entonces sano)
    df7["Selector"] = np.where((df7["Riesgo_Base"] > 70) & (df7["Protector_Z"] <= 80), 1, 2)
    df7.to_csv("blind_tests/scenario_7_protective.csv", index=False)
    
    print("Generated 7 blind datasets.")

if __name__ == '__main__':
    generate_blind_datasets()
