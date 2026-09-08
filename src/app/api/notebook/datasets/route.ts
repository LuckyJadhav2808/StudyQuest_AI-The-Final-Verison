import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PRESET_DATASETS } from '@/data/notebookDatasets';

const USER_DATASETS_DIR = path.join(process.cwd(), 'src', 'components', 'notebook', 'datasets');
const REPO_DATASETS_DIR = path.join(process.cwd(), 'src', 'data', 'datasets');

// Pre-defined friendly metadata for known dataset files
const DATASET_METADATA_MAP: Record<
  string,
  {
    name: string;
    description: string;
    category: 'Classification' | 'Regression' | 'Clustering' | 'EDA' | 'Machine Learning';
    icon: string;
    starterCode?: string;
  }
> = {
  'mall_customers.csv': {
    name: 'Mall Customer Segmentation',
    description: 'Annual Income vs. Spending Score (1-100) for 200 retail customers. Ideal for K-Means Clustering & Customer Segmentation.',
    category: 'Clustering',
    icon: '🛍️',
    starterCode: `# Mall Customer Clustering with K-Means
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans

df = pd.read_csv('Mall_Customers.csv')
print("Customer Dataset Info:")
print(df.describe())

# K-Means Clustering on Income vs Spending
X = df[['Annual Income (k$)', 'Spending Score (1-100)']]
kmeans = KMeans(n_clusters=5, random_state=42).fit(X)
df['Cluster'] = kmeans.labels_

plt.figure(figsize=(9, 5))
sns.scatterplot(
    data=df,
    x='Annual Income (k$)',
    y='Spending Score (1-100)',
    hue='Cluster',
    palette='Set1',
    s=100,
    alpha=0.9
)
plt.title('Mall Customer Segments (K-Means Clusters)', fontsize=14, fontweight='bold')
plt.grid(True, linestyle='--', alpha=0.5)
plt.show()

df.head()`,
  },
  'cancer.csv': {
    name: 'Breast Cancer Diagnostic Dataset',
    description: 'Cell nucleus characteristics computed from digitized FNA images. The gold standard for binary cancer diagnosis classification.',
    category: 'Classification',
    icon: '🔬',
    starterCode: `# Breast Cancer Diagnostic Classification
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

df = pd.read_csv('cancer.csv')
print(f"Diagnosis Distribution:\\n{df['diagnosis'].value_counts()}")

# Clean dataset
if 'id' in df.columns:
    df = df.drop(columns=['id'])
if 'Unnamed: 32' in df.columns:
    df = df.drop(columns=['Unnamed: 32'])

X = df.drop(columns=['diagnosis'])
y = df['diagnosis']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
clf = RandomForestClassifier(n_estimators=100, random_state=42).fit(X_train, y_train)

print(f"\\nRandom Forest Model Accuracy: {clf.score(X_test, y_test)*100:.2f}%")
print("\\nClassification Report:")
print(classification_report(y_test, clf.predict(X_test)))

df.head()`,
  },
  'diabetes.csv': {
    name: 'Pima Indians Diabetes Diagnostic',
    description: 'Diagnostic medical measurements (Glucose, Blood Pressure, Insulin, BMI) to predict diabetes onset.',
    category: 'Classification',
    icon: '🩺',
    starterCode: `# Diabetes Risk Prediction
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv('diabetes.csv')
print(f"Diabetes Outcome Distribution: {df['Outcome'].value_counts().to_dict()}")

# Correlation heatmap
plt.figure(figsize=(9, 5))
sns.heatmap(df.corr(), annot=True, cmap='coolwarm', fmt='.2f', linewidths=0.5)
plt.title('Diabetes Risk Factor Correlation Matrix', fontsize=13, fontweight='bold')
plt.show()

df.head()`,
  },
  'heart_attack.csv': {
    name: 'Heart Attack Risk Analysis',
    description: '8,700+ patient records with cholesterol, blood pressure, heart rate, smoking, diet, and heart attack risk indicators.',
    category: 'Classification',
    icon: '❤️',
    starterCode: `# Heart Attack Risk Factor Analysis
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv('heart_attack.csv')
print(f"Loaded {len(df)} patient records")

# Age vs Heart Attack Risk
if 'Heart Attack Risk' in df.columns:
    risk_col = 'Heart Attack Risk'
elif 'Target' in df.columns:
    risk_col = 'Target'
else:
    risk_col = df.columns[-1]

plt.figure(figsize=(8, 4))
sns.histplot(data=df, x='Age', hue=risk_col, kde=True, palette='coolwarm')
plt.title('Patient Age vs Heart Attack Risk Distribution', fontsize=13, fontweight='bold')
plt.show()

df.head()`,
  },
  'insurance.csv': {
    name: 'Medical Insurance Cost Prediction',
    description: 'Individual medical costs billed by health insurance based on age, BMI, smoking status, and region.',
    category: 'Regression',
    icon: '🏥',
    starterCode: `# Medical Insurance Cost Prediction (Regression)
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv('insurance.csv')
print("Insurance Cost Breakdown:")
print(df.describe())

# Expenses by Smoker Status
expense_col = 'expenses' if 'expenses' in df.columns else 'charges'
plt.figure(figsize=(8, 4))
sns.boxplot(data=df, x='smoker', y=expense_col, palette='Set2')
plt.title('Medical Insurance Charges: Smoker vs Non-Smoker', fontsize=13, fontweight='bold')
plt.show()

df.head()`,
  },
  'loan_amount.csv': {
    name: 'Loan Approval & Eligibility Prediction',
    description: 'Financial dataset with applicant income, co-applicant income, credit history, and loan approval status.',
    category: 'Classification',
    icon: '💳',
    starterCode: `# Loan Eligibility & Risk Analytics
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv('loan_amount.csv')
print("Applicant Income vs Loan Amount:")

plt.figure(figsize=(8, 4))
sns.scatterplot(data=df, x='ApplicantIncome', y='LoanAmount', hue='Gender', alpha=0.8)
plt.title('Applicant Income vs Requested Loan Amount', fontsize=13, fontweight='bold')
plt.grid(True, linestyle='--', alpha=0.5)
plt.show()

df.head()`,
  },
  'solar_power_output.csv': {
    name: 'Solar Power Output Generation',
    description: 'Renewable energy dataset tracking temperature, humidity, wind speed, solar irradiance, and power generation.',
    category: 'Regression',
    icon: '☀️',
    starterCode: `# Solar Power Generation Analysis
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv('solar_power_output.csv')
print(f"Solar Power Metrics:\\n{df.describe()}")

plt.figure(figsize=(8, 4))
sns.scatterplot(data=df, x='solar_irradiance', y='solar_power_output', color='#F59E0B')
plt.title('Solar Irradiance vs Power Output Generation', fontsize=13, fontweight='bold')
plt.grid(True, linestyle='--', alpha=0.5)
plt.show()

df.head()`,
  },
  'waste_classification_dataset_500.csv': {
    name: 'Waste & Recycling Classification',
    description: 'Eco-analytics dataset with weight, moisture %, hardness, magnetism, and biodegradability to classify waste types.',
    category: 'Classification',
    icon: '♻️',
    starterCode: `# Waste Material Classification
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv('waste_classification_dataset_500.csv')
print(f"Waste Categories:\\n{df['WasteType'].value_counts()}")

plt.figure(figsize=(8, 4))
sns.countplot(data=df, x='WasteType', palette='viridis')
plt.title('Waste Type Distribution for Recycling Automation', fontsize=13, fontweight='bold')
plt.show()

df.head()`,
  },
  'credit_score.csv': {
    name: 'Credit Score Classification',
    description: 'Financial demographics including income, education, home ownership, and credit score ratings.',
    category: 'Classification',
    icon: '📊',
    starterCode: `# Credit Score Analysis
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('credit_score.csv')
print("Credit Score Distribution:")
print(df.info())
df.head()`,
  },
  'iris.csv': {
    name: 'Iris Flower Dataset',
    description: '150 samples with 4 features (sepal/petal length & width) across 3 species (Setosa, Versicolor, Virginica).',
    category: 'Classification',
    icon: '🌸',
  },
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const file = searchParams.get('file');

  // If a specific file is requested, return its content
  if (file) {
    const safeFilename = path.basename(file).toLowerCase();

    // 1. Check user-provided datasets directory
    if (fs.existsSync(USER_DATASETS_DIR)) {
      const userFiles = fs.readdirSync(USER_DATASETS_DIR);
      const matched = userFiles.find((f) => f.toLowerCase() === safeFilename);
      if (matched) {
        const content = fs.readFileSync(path.join(USER_DATASETS_DIR, matched), 'utf-8');
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    // 2. Check embedded preset datasets
    const preset = PRESET_DATASETS.find((d) => d.filename.toLowerCase() === safeFilename || d.id === file);
    if (preset) {
      return new NextResponse(preset.csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 3. Check repository datasets directory (e.g. LeetCode questions)
    if (fs.existsSync(REPO_DATASETS_DIR)) {
      let targetPath = path.join(REPO_DATASETS_DIR, safeFilename);
      if (safeFilename === 'leetcode_questions.csv') {
        targetPath = path.join(REPO_DATASETS_DIR, 'Leetcode_Questions_updated (2024-11-02).csv');
      } else if (safeFilename === 'leetcode_analytics.csv') {
        targetPath = path.join(REPO_DATASETS_DIR, 'leetcode_dataset - lc.csv');
      }

      if (fs.existsSync(targetPath)) {
        const content = fs.readFileSync(targetPath, 'utf-8');
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
  }

  // Build catalogue dynamically
  const catalogue: any[] = [];
  const seenFiles = new Set<string>();

  // 1. Scan user-provided datasets folder
  if (fs.existsSync(USER_DATASETS_DIR)) {
    const userFiles = fs.readdirSync(USER_DATASETS_DIR);
    for (const userFile of userFiles) {
      if (!userFile.endsWith('.csv')) continue;
      const lower = userFile.toLowerCase();
      seenFiles.add(lower);

      const filePath = path.join(USER_DATASETS_DIR, userFile);
      const meta = DATASET_METADATA_MAP[lower] || {
        name: userFile.replace(/\.csv$/i, '').replace(/_/g, ' '),
        description: `User-provided dataset with tabular data for machine learning and analytics.`,
        category: 'Machine Learning' as const,
        icon: '📁',
      };

      // Read sample to get rows and columns
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);
        const headers = lines[0] ? lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '')) : [];
        const rows = Math.max(0, lines.length - 1);

        catalogue.push({
          id: userFile.replace(/\.csv$/i, '').toLowerCase(),
          name: meta.name,
          filename: userFile,
          description: meta.description,
          category: meta.category,
          icon: meta.icon,
          rows,
          columns: headers.slice(0, 10),
          starterCode:
            meta.starterCode ||
            `# Analysis for ${userFile}
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv('${userFile}')
print(f"Loaded {len(df)} rows from ${userFile}")
print(df.info())
df.head()`,
        });
      } catch (e) {
        // Skip unreadable files
      }
    }
  }

  // 2. Add remaining preset datasets
  for (const p of PRESET_DATASETS) {
    const lower = p.filename.toLowerCase();
    if (seenFiles.has(lower)) continue;
    seenFiles.add(lower);

    catalogue.push({
      id: p.id,
      name: p.name,
      filename: p.filename,
      description: p.description,
      category: p.category,
      icon: p.icon,
      rows: p.rows,
      columns: p.columns,
      starterCode: p.starterCode,
    });
  }

  // 3. Add LeetCode repository datasets
  catalogue.push({
    id: 'leetcode_questions',
    name: 'LeetCode 3,300+ Problems & Acceptance Rates',
    filename: 'leetcode_questions.csv',
    description: 'Complete dataset of 3,300+ LeetCode problems with difficulty (Easy/Med/Hard), topic tags, acceptance rate %, and solution links.',
    category: 'Machine Learning',
    icon: '💻',
    rows: 3308,
    columns: ['Question_No', 'Question', 'Topic_tags', 'Acceptance_rate', 'isPremium', 'Difficulty'],
    starterCode: `# LeetCode Problems Analysis & Analytics
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv('leetcode_questions.csv')
print(f"Total Problems: {len(df)}")
print(df['Difficulty'].value_counts())

# Acceptance Rate distribution by Difficulty
df['Acceptance_rate_num'] = df['Acceptance_rate'].str.rstrip('%').astype(float)

plt.figure(figsize=(9, 4))
sns.boxplot(data=df, x='Difficulty', y='Acceptance_rate_num', order=['Easy', 'Medium', 'Hard'], palette='viridis')
plt.title('LeetCode Acceptance Rate Distribution by Difficulty', fontsize=13, fontweight='bold')
plt.ylabel('Acceptance Rate (%)')
plt.show()

df[['Question_No', 'Question', 'Difficulty', 'Acceptance_rate']].head()`,
  });

  return NextResponse.json({ datasets: catalogue });
}
