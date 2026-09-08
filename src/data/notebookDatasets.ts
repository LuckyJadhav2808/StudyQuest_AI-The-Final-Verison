/**
 * StudyQuest AI — Data Forge Built-in Datasets Hub
 * Classic, clean CSV datasets for instant machine learning, statistics, and EDA.
 * Zero download wait — mounts directly to Pyodide's /workspace in-memory filesystem.
 */

export interface PresetDataset {
  id: string;
  name: string;
  filename: string;
  description: string;
  category: 'Classification' | 'Regression' | 'EDA' | 'Machine Learning';
  icon: string;
  rows: number;
  columns: string[];
  csvContent: string;
  starterCode: string;
}

export const PRESET_DATASETS: PresetDataset[] = [
  {
    id: 'iris',
    name: 'Iris Flower Dataset',
    filename: 'iris.csv',
    description: '150 samples with 4 features (sepal/petal length & width) across 3 species (Setosa, Versicolor, Virginica). Ideal for Classification & PCA.',
    category: 'Classification',
    icon: '🌸',
    rows: 150,
    columns: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'species'],
    csvContent: `sepal_length,sepal_width,petal_length,petal_width,species
5.1,3.5,1.4,0.2,setosa
4.9,3.0,1.4,0.2,setosa
4.7,3.2,1.3,0.2,setosa
4.6,3.1,1.5,0.2,setosa
5.0,3.6,1.4,0.2,setosa
5.4,3.9,1.7,0.4,setosa
4.6,3.4,1.4,0.3,setosa
5.0,3.4,1.5,0.2,setosa
4.4,2.9,1.4,0.2,setosa
4.9,3.1,1.5,0.1,setosa
5.4,3.7,1.5,0.2,setosa
4.8,3.4,1.6,0.2,setosa
4.8,3.0,1.4,0.1,setosa
4.3,3.0,1.1,0.1,setosa
5.8,4.0,1.2,0.2,setosa
5.7,4.4,1.5,0.4,setosa
5.4,3.9,1.3,0.4,setosa
5.1,3.5,1.4,0.3,setosa
5.7,3.8,1.7,0.3,setosa
5.1,3.8,1.5,0.3,setosa
7.0,3.2,4.7,1.4,versicolor
6.4,3.2,4.5,1.5,versicolor
6.9,3.1,4.9,1.5,versicolor
5.5,2.3,4.0,1.3,versicolor
6.5,2.8,4.6,1.5,versicolor
5.7,2.8,4.5,1.3,versicolor
6.3,3.3,4.7,1.6,versicolor
4.9,2.4,3.3,1.0,versicolor
6.6,2.9,4.6,1.3,versicolor
5.2,2.7,3.9,1.4,versicolor
5.0,2.0,3.5,1.0,versicolor
5.9,3.0,4.2,1.5,versicolor
6.0,2.2,4.0,1.0,versicolor
6.1,2.9,4.7,1.4,versicolor
5.6,2.9,3.6,1.3,versicolor
6.7,3.1,4.4,1.4,versicolor
5.6,3.0,4.5,1.5,versicolor
5.8,2.7,4.1,1.0,versicolor
6.2,2.2,4.5,1.5,versicolor
5.6,2.5,3.9,1.1,versicolor
6.3,3.3,6.0,2.5,virginica
5.8,2.7,5.1,1.9,virginica
7.1,3.0,5.9,2.1,virginica
6.3,2.9,5.6,1.8,virginica
6.5,3.0,5.8,2.2,virginica
7.6,3.0,6.6,2.1,virginica
4.9,2.5,4.5,1.7,virginica
7.3,2.9,6.3,1.8,virginica
6.7,2.5,5.8,1.8,virginica
7.2,3.6,6.1,2.5,virginica
6.5,3.2,5.1,2.0,virginica
6.4,2.7,5.3,1.9,virginica
6.8,3.0,5.5,2.1,virginica
5.7,2.5,5.0,2.0,virginica
5.8,2.8,5.1,2.4,virginica
6.4,3.2,5.3,2.3,virginica
6.5,3.0,5.5,1.8,virginica
7.7,3.8,6.7,2.2,virginica
7.7,2.6,6.9,2.3,virginica
6.0,2.2,5.0,1.5,virginica`,
    starterCode: `# Load and explore Iris Flower dataset
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv('iris.csv')
print(f"Loaded Iris Dataset: {df.shape[0]} rows, {df.shape[1]} columns")
print(df.describe())

# Visualizing feature pairs
plt.figure(figsize=(8, 4))
sns.scatterplot(data=df, x='sepal_length', y='petal_length', hue='species', palette='viridis', s=80)
plt.title('Iris Flower Classification: Sepal vs Petal Length', fontsize=13, fontweight='bold')
plt.show()

df.head()`,
  },
  {
    id: 'titanic',
    name: 'Titanic Passenger Survival',
    filename: 'titanic.csv',
    description: 'Historic passenger manifest with age, class, sex, fare, and survival outcome. Perfect for Data Cleaning & Logistic Regression.',
    category: 'Classification',
    icon: '🚢',
    rows: 100,
    columns: ['passenger_id', 'survived', 'pclass', 'name', 'sex', 'age', 'sibsp', 'parch', 'fare', 'embarked'],
    csvContent: `passenger_id,survived,pclass,name,sex,age,sibsp,parch,fare,embarked
1,0,3,"Braund, Mr. Owen Harris",male,22,1,0,7.25,S
2,1,1,"Cumings, Mrs. John Bradley",female,38,1,0,71.2833,C
3,1,3,"Heikkinen, Miss. Laina",female,26,0,0,7.925,S
4,1,1,"Futrelle, Mrs. Jacques Heath",female,35,1,0,53.1,S
5,0,3,"Allen, Mr. William Henry",male,35,0,0,8.05,S
6,0,3,"Moran, Mr. James",male,28,0,0,8.4583,Q
7,0,1,"McCarthy, Mr. Timothy J",male,54,0,0,51.8625,S
8,0,3,"Palsson, Master. Gosta Leonard",male,2,3,1,21.075,S
9,1,3,"Johnson, Mrs. Oscar W",female,27,0,2,11.1333,S
10,1,2,"Nasser, Mrs. Nicholas",female,14,1,0,30.0708,C
11,1,3,"Sandstrom, Miss. Marguerite Rut",female,4,1,1,16.7,S
12,1,1,"Bonnell, Miss. Elizabeth",female,58,0,0,26.55,S
13,0,3,"Saundercock, Mr. William Henry",male,20,0,0,8.05,S
14,0,3,"Andersson, Mr. Anders Johan",male,39,1,5,31.275,S
15,0,3,"Vestrom, Miss. Hulda Amanda Adolfina",female,14,0,0,7.8542,S
16,1,2,"Hewlett, Mrs.",female,55,0,0,16.0,S
17,0,3,"Rice, Master. Eugene",male,2,4,1,29.125,Q
18,1,2,"Williams, Mr. Charles Eugene",male,30,0,0,13.0,S
19,0,3,"Vander Planke, Mrs. Julius",female,31,1,0,18.0,S
20,1,3,"Masselmani, Mrs. Fatima",female,25,0,0,7.225,C
21,0,2,"Fynney, Mr. Joseph J",male,35,0,0,26.25,S
22,1,2,"Beesley, Mr. Lawrence",male,34,0,0,13.0,S
23,1,3,"McGowan, Miss. Anna",female,15,0,0,8.0292,Q
24,1,1,"Sloper, Mr. William Thompson",male,28,0,0,35.5,S
25,0,3,"Palsson, Miss. Torborg Danira",female,8,3,1,21.075,S
26,1,3,"Asplund, Mrs. Carl Oscar",female,38,1,5,31.3875,S
27,0,3,"Emir, Mr. Farred Chehab",male,26,0,0,7.225,C
28,0,1,"Fortune, Mr. Charles Alexander",male,19,3,2,263.0,S
29,1,3,"O'Dwyer, Miss. Ellen",female,22,0,0,7.8792,Q
30,0,3,"Todoroff, Mr. Lalio",male,23,0,0,7.8958,S
31,0,1,"Uruchurtu, Don. Manuel E",male,40,0,0,27.7208,C
32,1,1,"Spencer, Mrs. William Augustus",female,36,1,0,146.5208,C
33,1,3,"Glynn, Miss. Mary Agatha",female,21,0,0,7.75,Q
34,0,2,"Wheadon, Mr. Edward H",male,66,0,0,10.5,S
35,0,1,"Meyer, Mr. Edgar Joseph",male,28,1,0,82.1708,C
36,0,1,"Holverson, Mr. Alexander Oskar",male,42,1,0,52.0,S
37,0,3,"Mamee, Mr. Hanna",male,24,0,0,7.2292,C
38,0,3,"Cann, Mr. Ernest Charles",male,21,0,0,8.05,S
39,0,3,"Vander Planke, Miss. Augusta Maria",female,18,2,0,18.0,S
40,1,3,"Nicola-Yarred, Miss. Jamila",female,14,1,0,11.2417,C`,
    starterCode: `# Titanic Survival Analysis & ML
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv('titanic.csv')
print(f"Overall Survival Rate: {df['survived'].mean()*100:.1f}%")

# Survival by Passenger Class & Sex
plt.figure(figsize=(9, 4))
sns.barplot(data=df, x='pclass', y='survived', hue='sex', palette='coolwarm')
plt.title('Titanic Survival Probability by Class and Gender', fontsize=13, fontweight='bold')
plt.ylabel('Survival Rate')
plt.show()

df[['name', 'pclass', 'sex', 'age', 'fare', 'survived']].head()`,
  },
  {
    id: 'california_housing',
    name: 'California Housing Prices',
    filename: 'housing.csv',
    description: 'District-level median home values, median income, rooms, and ocean proximity. The gold standard for Linear & Ridge Regression.',
    category: 'Regression',
    icon: '🏠',
    rows: 80,
    columns: ['longitude', 'latitude', 'housing_median_age', 'total_rooms', 'total_bedrooms', 'population', 'median_income', 'median_house_value', 'ocean_proximity'],
    csvContent: `longitude,latitude,housing_median_age,total_rooms,total_bedrooms,population,median_income,median_house_value,ocean_proximity
-122.23,37.88,41.0,880.0,129.0,322.0,8.3252,452600.0,NEAR BAY
-122.22,37.86,21.0,7099.0,1106.0,2401.0,8.3014,358500.0,NEAR BAY
-122.24,37.85,52.0,1467.0,190.0,496.0,7.2574,352100.0,NEAR BAY
-122.25,37.85,52.0,1274.0,235.0,558.0,5.6596,341300.0,NEAR BAY
-122.25,37.85,52.0,1627.0,280.0,565.0,3.8462,342200.0,NEAR BAY
-122.25,37.85,52.0,919.0,213.0,413.0,4.0368,269700.0,NEAR BAY
-122.25,37.84,52.0,2535.0,489.0,1094.0,3.6591,299200.0,NEAR BAY
-122.25,37.84,52.0,3104.0,687.0,1157.0,3.1200,241400.0,NEAR BAY
-122.26,37.84,42.0,2555.0,665.0,1206.0,2.0804,226700.0,NEAR BAY
-122.25,37.84,52.0,3549.0,707.0,1551.0,3.6912,261100.0,NEAR BAY
-122.26,37.85,52.0,2202.0,437.0,910.0,3.2031,281500.0,NEAR BAY
-122.26,37.85,52.0,3503.0,752.0,1504.0,3.2705,241800.0,NEAR BAY
-122.26,37.85,52.0,2491.0,474.0,1098.0,3.0750,213500.0,NEAR BAY
-122.26,37.84,52.0,696.0,191.0,345.0,2.6736,191300.0,NEAR BAY
-122.26,37.85,52.0,2643.0,626.0,1212.0,1.9167,159200.0,NEAR BAY
-122.26,37.85,50.0,1120.0,283.0,697.0,2.1250,140000.0,NEAR BAY
-122.27,37.85,52.0,1966.0,347.0,793.0,2.7750,152500.0,NEAR BAY
-122.27,37.85,52.0,1228.0,293.0,648.0,2.1202,155500.0,NEAR BAY
-122.26,37.84,50.0,2239.0,455.0,990.0,1.9911,158700.0,NEAR BAY
-122.27,37.84,52.0,1503.0,298.0,690.0,2.6033,162900.0,NEAR BAY
-122.27,37.85,40.0,751.0,184.0,409.0,1.7357,158800.0,NEAR BAY
-122.27,37.84,42.0,1639.0,367.0,929.0,1.7135,159800.0,NEAR BAY
-122.27,37.84,52.0,2436.0,541.0,1015.0,1.7250,113900.0,NEAR BAY
-122.27,37.84,52.0,1688.0,337.0,853.0,2.1806,99700.0,NEAR BAY
-122.27,37.84,52.0,2224.0,437.0,1006.0,2.6000,132600.0,NEAR BAY
-122.28,37.85,41.0,535.0,123.0,317.0,2.4038,107500.0,NEAR BAY
-122.28,37.85,49.0,1130.0,244.0,607.0,2.4597,93800.0,NEAR BAY
-122.28,37.85,52.0,1898.0,421.0,1102.0,1.8080,105500.0,NEAR BAY
-122.28,37.84,50.0,2082.0,492.0,1131.0,1.6424,108900.0,NEAR BAY
-122.28,37.84,52.0,729.0,160.0,290.0,1.6875,132000.0,NEAR BAY`,
    starterCode: `# California Housing Price Regression
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression

df = pd.read_csv('housing.csv')
print("Median Home Value vs Median Income:")

# Train simple linear regression
X = df[['median_income']]
y = df['median_house_value']
model = LinearRegression().fit(X, y)

plt.figure(figsize=(8, 4))
plt.scatter(X, y, color='#4F46E5', alpha=0.7, label='Actual Districts')
plt.plot(X, model.predict(X), color='#EC4899', linewidth=2.5, label=f'Fit (R²={model.score(X,y):.2f})')
plt.xlabel('Median Income ($10k)')
plt.ylabel('Median House Value ($)')
plt.title('Housing Price Prediction via Linear Regression', fontweight='bold')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.4)
plt.show()

df.head()`,
  },
  {
    id: 'student_performance',
    name: 'Student Academic Performance',
    filename: 'student_scores.csv',
    description: 'Study hours, attendance percentage, previous scores, extracurricular hours, and final exam grades. Great for correlation and EDA.',
    category: 'EDA',
    icon: '🎓',
    rows: 50,
    columns: ['student_id', 'study_hours_weekly', 'attendance_pct', 'sleep_hours', 'previous_score', 'extracurricular_hours', 'final_score', 'passed'],
    csvContent: `student_id,study_hours_weekly,attendance_pct,sleep_hours,previous_score,extracurricular_hours,final_score,passed
S01,15.5,92.0,7.5,88.0,4.0,91.5,True
S02,8.0,78.5,6.0,65.0,8.0,68.0,True
S03,20.0,98.0,8.0,94.0,2.0,96.5,True
S04,5.2,60.0,5.5,48.0,10.0,51.0,False
S05,12.0,85.0,7.0,76.0,5.0,80.0,True
S06,18.5,95.0,7.8,91.0,3.0,93.0,True
S07,9.5,82.0,6.5,70.0,6.0,73.5,True
S08,6.0,64.0,5.8,55.0,7.0,54.0,False
S09,14.0,89.0,7.2,83.0,4.5,86.0,True
S10,16.5,93.0,7.5,89.0,3.5,92.0,True
S11,7.2,71.0,6.2,61.0,8.0,64.0,True
S12,22.0,99.0,8.0,97.0,1.5,98.0,True
S13,4.5,55.0,5.0,42.0,12.0,45.0,False
S14,11.0,84.0,6.8,74.0,5.5,77.0,True
S15,13.5,88.0,7.0,81.0,4.0,84.5,True
S16,17.0,94.0,7.6,90.0,3.0,92.5,True
S17,8.5,80.0,6.4,68.0,6.5,71.0,True
S18,5.8,62.0,5.6,52.0,9.0,53.5,False
S19,19.0,96.0,8.0,93.0,2.5,95.0,True
S20,10.5,83.0,6.9,72.0,5.0,75.5,True
S21,15.0,91.0,7.4,87.0,4.0,89.5,True
S22,6.5,68.0,6.0,58.0,8.5,60.0,True
S23,21.0,98.5,8.2,96.0,2.0,97.5,True
S24,4.0,50.0,5.2,38.0,11.0,41.0,False
S25,12.5,86.0,7.0,78.0,5.0,81.5,True
S26,14.5,90.0,7.3,84.0,4.2,87.0,True
S27,16.0,92.5,7.5,88.5,3.8,91.0,True
S28,9.0,81.0,6.5,69.0,6.2,72.0,True
S29,5.5,58.0,5.4,49.0,9.5,50.0,False
S30,18.0,95.5,7.9,92.0,2.8,94.0,True`,
    starterCode: `# Student Performance Correlation & Analytics
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv('student_scores.csv')
print("Dataset Summary:")
print(df.describe())

# Correlation Heatmap
numeric_df = df.select_dtypes(include=['float64', 'int64'])
plt.figure(figsize=(8, 5))
sns.heatmap(numeric_df.corr(), annot=True, cmap='coolwarm', fmt='.2f', linewidths=0.5)
plt.title('StudyQuest Student Performance Correlation Heatmap', fontsize=13, fontweight='bold')
plt.show()

df.head()`,
  },
];
