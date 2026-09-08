/**
 * StudyQuest AI — Data Forge Python Recipes & Snippets
 * Production-ready templates for Data Cleaning, EDA, Visualization, and Machine Learning.
 */

export interface NotebookRecipe {
  id: string;
  title: string;
  category: 'cleaning' | 'visualization' | 'ml' | 'statistics';
  description: string;
  tags: string[];
  code: string;
}

export const NOTEBOOK_RECIPES: NotebookRecipe[] = [
  // --- Data Cleaning & Preprocessing ---
  {
    id: 'clean_missing_values',
    title: 'Missing Values Imputation (Median / Mode)',
    category: 'cleaning',
    description: 'Inspect null values count and fill numeric columns with median and categorical with mode.',
    tags: ['pandas', 'missing data', 'imputation'],
    code: `# 1. Inspect missing values
print("--- Missing Values Count ---")
print(df.isnull().sum())

# 2. Impute numeric columns with median
num_cols = df.select_dtypes(include=['number']).columns
for col in num_cols:
    df[col] = df[col].fillna(df[col].median())

# 3. Impute categorical columns with mode
cat_cols = df.select_dtypes(include=['object', 'category']).columns
for col in cat_cols:
    if len(df[col].mode()) > 0:
        df[col] = df[col].fillna(df[col].mode()[0])

print("\\n✅ Missing values imputed successfully!")
print(f"Remaining nulls: {df.isnull().sum().sum()}")`,
  },
  {
    id: 'clean_remove_outliers_iqr',
    title: 'Outlier Removal using IQR (Interquartile Range)',
    category: 'cleaning',
    description: 'Filter out extreme statistical outliers from numeric columns using the 1.5 * IQR rule.',
    tags: ['cleaning', 'outliers', 'iqr', 'pandas'],
    code: `def remove_outliers_iqr(data, col):
    Q1 = data[col].quantile(0.25)
    Q3 = data[col].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    initial_rows = len(data)
    filtered = data[(data[col] >= lower_bound) & (data[col] <= upper_bound)]
    print(f"Removed {initial_rows - len(filtered)} outliers from '{col}'.")
    return filtered

# Example: apply to the first numeric column
num_col = df.select_dtypes(include=['number']).columns[0]
df_clean = remove_outliers_iqr(df, num_col)
print(f"New dataset shape: {df_clean.shape}")`,
  },
  {
    id: 'clean_one_hot_encode',
    title: 'One-Hot & Categorical Encoding',
    category: 'cleaning',
    description: 'Convert categorical string variables into binary dummy columns ready for ML models.',
    tags: ['encoding', 'preprocessing', 'pandas'],
    code: `# Identify categorical columns
cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
print("Categorical columns to encode:", cat_cols)

# Apply pd.get_dummies with drop_first=True to avoid collinearity
df_encoded = pd.get_dummies(df, columns=cat_cols, drop_first=True)

print("Original shape:", df.shape)
print("Encoded shape:", df_encoded.shape)
df_encoded.head()`,
  },
  {
    id: 'clean_feature_scaling',
    title: 'StandardScaler & MinMaxScaler Normalization',
    category: 'cleaning',
    description: 'Scale numeric features to zero mean & unit variance (or 0-1 range) for distance-based ML.',
    tags: ['scikit-learn', 'scaling', 'normalization'],
    code: `from sklearn.preprocessing import StandardScaler, MinMaxScaler

# Select numeric features
num_cols = df.select_dtypes(include=['number']).columns

# StandardScaler: mean=0, std=1
scaler = StandardScaler()
df_scaled = df.copy()
df_scaled[num_cols] = scaler.fit_transform(df[num_cols])

print("✅ Features scaled with StandardScaler:")
df_scaled[num_cols].describe().round(2)`,
  },

  // --- Visualization & EDA ---
  {
    id: 'viz_correlation_heatmap',
    title: 'Correlation Matrix Heatmap (Seaborn)',
    category: 'visualization',
    description: 'Plot an annotated correlation heatmap to inspect linear relationships between variables.',
    tags: ['seaborn', 'matplotlib', 'correlation', 'heatmap'],
    code: `import matplotlib.pyplot as plt
import seaborn as sns

# Compute numeric correlation matrix
numeric_df = df.select_dtypes(include=['number'])
corr = numeric_df.corr()

plt.figure(figsize=(9, 6), dpi=120)
sns.heatmap(
    corr, 
    annot=True, 
    fmt=".2f", 
    cmap="coolwarm", 
    vmin=-1, 
    vmax=1, 
    linewidths=0.5,
    cbar_kws={'label': 'Correlation Coefficient'}
)
plt.title("Feature Correlation Heatmap", fontsize=14, fontweight='bold', pad=12)
plt.tight_layout()
plt.show()`,
  },
  {
    id: 'viz_feature_distributions',
    title: 'Multi-Feature Distribution Histograms with KDE',
    category: 'visualization',
    description: 'Subplot grid plotting distribution curves across all numerical features.',
    tags: ['visualization', 'histogram', 'kde', 'seaborn'],
    code: `import matplotlib.pyplot as plt
import seaborn as sns

num_cols = df.select_dtypes(include=['number']).columns[:4] # First 4 numeric cols
n_cols = len(num_cols)

plt.figure(figsize=(5 * n_cols, 4), dpi=120)
for i, col in enumerate(num_cols):
    plt.subplot(1, n_cols, i + 1)
    sns.histplot(df[col], kde=True, color='indigo', bins=20)
    plt.title(f"Distribution of {col}", fontsize=11, fontweight='bold')
    plt.xlabel(col)
    plt.ylabel("Frequency")

plt.tight_layout()
plt.show()`,
  },
  {
    id: 'viz_pairplot',
    title: 'Seaborn Pairplot with Hue Classification',
    category: 'visualization',
    description: 'Scatter matrix across all numerical pairs with kernel density estimation diagonals.',
    tags: ['seaborn', 'pairplot', 'eda'],
    code: `import seaborn as sns
import matplotlib.pyplot as plt

# Select subset of columns for fast rendering
numeric_cols = df.select_dtypes(include=['number']).columns[:3].tolist()
target_cols = df.select_dtypes(include=['object']).columns

hue_col = target_cols[0] if len(target_cols) > 0 else None

print(f"Generating pairplot for columns: {numeric_cols}, hue={hue_col}")
g = sns.pairplot(df[numeric_cols + ([hue_col] if hue_col else [])], hue=hue_col, corner=True, palette='tab10')
plt.suptitle("Pairwise Feature Relationships", y=1.02, fontsize=14, fontweight='bold')
plt.show()`,
  },
  {
    id: 'viz_boxplot_outliers',
    title: 'Boxplot & Outlier Visualizer',
    category: 'visualization',
    description: 'Visualize quartile spreads and individual outlier points across numerical variables.',
    tags: ['visualization', 'boxplot', 'outliers'],
    code: `import matplotlib.pyplot as plt
import seaborn as sns

num_cols = df.select_dtypes(include=['number']).columns[:3]

plt.figure(figsize=(10, 5), dpi=120)
sns.boxplot(data=df[num_cols], palette="Set2")
plt.title("Boxplot Distribution & Outlier Points", fontsize=13, fontweight='bold')
plt.ylabel("Values")
plt.xticks(rotation=15)
plt.tight_layout()
plt.show()`,
  },

  // --- Machine Learning Pipelines ---
  {
    id: 'ml_random_forest_classification',
    title: 'Train/Test Split & Random Forest Classifier',
    category: 'ml',
    description: 'End-to-end classification pipeline: train/test split, Random Forest training, and metrics evaluation.',
    tags: ['scikit-learn', 'random forest', 'classification'],
    code: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# 1. Prepare X and y (adjust column names as needed)
target_col = df.columns[-1] # Assuming last column is target
X = df.drop(columns=[target_col]).select_dtypes(include=['number'])
y = df[target_col]

# 2. Train / Test Split (80% train, 20% test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Train Random Forest Model
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# 4. Evaluate Performance
y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)

print(f"🎯 Model Accuracy: {acc * 100:.2f}%\\n")
print("--- Classification Report ---")
print(classification_report(y_test, y_pred))`,
  },
  {
    id: 'ml_confusion_matrix',
    title: 'Confusion Matrix Heatmap Evaluation',
    category: 'ml',
    description: 'Plot a clean, color-coded confusion matrix comparing actual vs predicted classes.',
    tags: ['scikit-learn', 'confusion matrix', 'metrics', 'heatmap'],
    code: `import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix

cm = confusion_matrix(y_test, y_pred)

plt.figure(figsize=(6, 5), dpi=120)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=False,
            xticklabels=clf.classes_, yticklabels=clf.classes_)
plt.title("Confusion Matrix Heatmap", fontsize=13, fontweight='bold')
plt.xlabel("Predicted Class", fontweight='bold')
plt.ylabel("True Class", fontweight='bold')
plt.tight_layout()
plt.show()`,
  },
  {
    id: 'ml_kmeans_clustering',
    title: 'K-Means Clustering & Elbow Curve',
    category: 'ml',
    description: 'Unsupervised learning: calculate inertia across k=1 to 10 to find the optimal cluster count.',
    tags: ['unsupervised', 'kmeans', 'clustering', 'elbow'],
    code: `import matplotlib.pyplot as plt
from sklearn.cluster import KMeans

# Select features for clustering
X_cluster = df.select_dtypes(include=['number']).iloc[:, :2]

# Calculate inertia for k=1 to 10
inertias = []
K_range = range(1, 10)
for k in K_range:
    km = KMeans(n_clusters=k, random_state=42, n_init='auto')
    km.fit(X_cluster)
    inertias.append(km.inertia_)

# Plot Elbow Curve
plt.figure(figsize=(7, 4), dpi=120)
plt.plot(K_range, inertias, 'bo-', linewidth=2, markersize=8)
plt.title("K-Means Elbow Method for Optimal k", fontsize=13, fontweight='bold')
plt.xlabel("Number of Clusters (k)", fontweight='bold')
plt.ylabel("Inertia (Sum of Squared Distances)", fontweight='bold')
plt.grid(True, linestyle='--', alpha=0.6)
plt.tight_layout()
plt.show()`,
  },
  {
    id: 'ml_linear_regression',
    title: 'Linear Regression & R² Trendline Plot',
    category: 'ml',
    description: 'Train a simple linear regression line and plot the fitted slope over scatter points.',
    tags: ['scikit-learn', 'regression', 'trendline'],
    code: `import matplotlib.pyplot as plt
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

# Pick two numeric features
num_cols = df.select_dtypes(include=['number']).columns
x_col, y_col = num_cols[0], num_cols[1]

X = df[[x_col]].values
y = df[y_col].values

# Fit Linear Regression
reg = LinearRegression()
reg.fit(X, y)
y_pred_line = reg.predict(X)
r2 = r2_score(y, y_pred_line)

# Plot Data & Regression Line
plt.figure(figsize=(7, 5), dpi=120)
plt.scatter(X, y, color='dodgerblue', alpha=0.6, label='Data Points')
plt.plot(X, y_pred_line, color='crimson', linewidth=2.5, 
         label=f'Fit Line (R² = {r2:.3f})')
plt.title(f"Linear Fit: {y_col} vs {x_col}", fontsize=13, fontweight='bold')
plt.xlabel(x_col)
plt.ylabel(y_col)
plt.legend()
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.show()

print(f"Slope (Coefficient): {reg.coef_[0]:.4f}")
print(f"Intercept: {reg.intercept_:.4f}")
print(f"R² Score: {r2:.4f}")`,
  },
  {
    id: 'ml_cross_validation',
    title: '5-Fold Cross-Validation Scores',
    category: 'ml',
    description: 'Evaluate model stability using 5-fold cross-validation with mean and standard deviation.',
    tags: ['scikit-learn', 'cross validation', 'model evaluation'],
    code: `from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestClassifier

target_col = df.columns[-1]
X = df.drop(columns=[target_col]).select_dtypes(include=['number'])
y = df[target_col]

clf = RandomForestClassifier(n_estimators=100, random_state=42)
scores = cross_val_score(clf, X, y, cv=5, scoring='accuracy')

print("--- 5-Fold Cross Validation Results ---")
for fold, s in enumerate(scores, 1):
    print(f"Fold {fold}: {s * 100:.2f}%")
print("-" * 35)
print(f"Mean Accuracy: {scores.mean() * 100:.2f}% (± {scores.std() * 100:.2f}%)")`,
  },
];
