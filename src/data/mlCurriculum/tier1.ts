import { MlTier } from '@/types/ml';

export const tier1Data: MlTier = {
  id: 'tier1',
  tierNumber: 1,
  title: 'Foundations of Machine Learning & Analytics',
  subtitle: 'What is ML, Vectorized NumPy, Tabular Pandas & Data Preprocessing',
  badge: 'Foundations',
  difficulty: 'Beginner',
  accentColor: '#38bdf8', // Sky
  description:
    'Establish an unshakeable mathematical and programming foundation. Master the formal definition of Machine Learning, high-performance array computing with NumPy, tabular data manipulation with Pandas, exploratory data analysis, and feature scaling pipelines.',
  concepts: [
    {
      id: 'what_is_ml',
      tierId: 'tier1',
      title: 'What is Machine Learning? Definitions & Paradigms',
      category: 'Foundations & Stack',
      difficulty: 'Beginner',
      summary:
        'Formal definition of Machine Learning (Tom Mitchell formulation), the 3 core learning paradigms (Supervised, Unsupervised, Reinforcement), and dataset anatomy.',
      estimatedMinutes: 20,
      tags: ['Machine Learning', 'Supervised Learning', 'Tom Mitchell', 'Data Science', 'Paradigms'],
      intuition:
        'Traditional software engineering is like writing a recipe: you write explicit rules, feed in data, and get an answer. Machine Learning flips this entirely: you feed in data and answers, and the computer writes the rules. Instead of hardcoding millions of "if/else" statements to identify spam emails or detect tumors, the machine automatically discovers mathematical patterns in historical examples.',
      technicalExplanation:
        '### 1. Formal Definition of Machine Learning\n\nIn 1997, computer scientist **Prof. Tom M. Mitchell** provided the definitive formal mathematical definition of Machine Learning:\n\n> **Definition (Tom Mitchell, 1997)**:\n> *"A computer program is said to learn from experience $\\mathcal{E}$ with respect to some class of tasks $\\mathcal{T}$ and performance measure $\\mathcal{P}$, if its performance at tasks in $\\mathcal{T}$, as measured by $\\mathcal{P}$, improves with experience $\\mathcal{E}$."*\n\nTo make this concrete across real-world systems:\n- **Spam Email Classifier**:\n  - Task $\\mathcal{T}$: Classifying incoming emails as Spam or Not Spam.\n  - Experience $\\mathcal{E}$: Watching you mark emails as spam / observing a labeled dataset of 100,000 historical emails.\n  - Performance measure $\\mathcal{P}$: The fraction of emails correctly classified (Accuracy / Precision / Recall).\n- **Autonomous Vehicle Steering**:\n  - Task $\\mathcal{T}$: Driving autonomously on a highway.\n  - Experience $\\mathcal{E}$: A sequence of video frames and steering wheel sensor angles recorded while a human drove.\n  - Performance measure $\\mathcal{P}$: Distance traveled safely without human intervention.\n\n---\n\n### 2. The Three Primary Machine Learning Paradigms\n\nAll machine learning tasks belong to one of three foundational paradigms:\n\n1. **Supervised Learning**:\n   - **Data**: A dataset of input-output pairs $\\mathcal{D} = \\{(x^{(1)}, y^{(1)}), (x^{(2)}, y^{(2)}), \\dots, (x^{(m)}, y^{(m)})\\}$.\n   - **Goal**: Learn a mapping function $f: \\mathcal{X} \\to \\mathcal{Y}$ such that given a previously unseen input $x^*$, the predicted output $\\hat{y} = f(x^*)$ is as close as possible to the true ground truth $y^*$.\n   - **Two Core Sub-types**:\n     - **Regression**: The target $y$ is a **continuous real number** (e.g. predicting house price in dollars $\\$425,000$, temperature in Celsius $24.8^\\circ\\text{C}$, stock return).\n     - **Classification**: The target $y$ is a **discrete categorical label** (e.g. binary spam detection $y \\in \\{0, 1\\}$, or multi-class handwriting digit recognition $y \\in \\{0, 1, \\dots, 9\\}$).\n\n2. **Unsupervised Learning**:\n   - **Data**: A dataset containing only inputs without any target labels $\\mathcal{D} = \\{x^{(1)}, x^{(2)}, \\dots, x^{(m)}\\}$.\n   - **Goal**: Discover latent structures, hidden clusters, probability distributions, or compact representations inherent in the feature space without human guidance.\n   - **Sub-types**: Clustering (K-Means, DBSCAN), Dimensionality Reduction (PCA, t-SNE), Density Estimation, and Anomaly Detection.\n\n3. **Reinforcement Learning (RL)**:\n   - **Setting**: An active agent interacts with a dynamic environment via trial and error.\n   - **Goal**: Maximize cumulative reward over time by learning an optimal policy $\\pi(a \\mid s)$ mapping environmental states $s \\in \\mathcal{S}$ to actions $a \\in \\mathcal{A}$ (e.g. AlphaGo, robot locomotion, LLM RLHF alignment).\n\n---\n\n### 3. Anatomy of a Machine Learning Dataset\n\nIn standard tabular ML, data is represented mathematically as:\n- **Feature Matrix $X \\in \\mathbb{R}^{m \\times n}$**:\n  - $m$: Number of training instances (samples or rows).\n  - $n$: Number of input dimensions (features or columns).\n  - $x^{(i)}$: A column or row vector representing all features for sample $i$.\n  - $x_j^{(i)}$: The scalar value of the $j$-th feature for sample $i$.\n- **Target Vector $y \\in \\mathbb{R}^m$**:\n  - The ground truth label associated with each instance $x^{(i)}$.',
      mathFormulas: [
        {
          title: "Mitchell's Machine Learning Framework",
          latex: '\\mathcal{P}(\\mathcal{T}, \\mathcal{E}_{t+\\Delta t}) > \\mathcal{P}(\\mathcal{T}, \\mathcal{E}_t)',
          explanation:
            'A system learns if performance measure P on task T strictly improves as historical experience E increases over time.',
        },
        {
          title: 'Supervised Learning Problem Formulation',
          latex: '\\mathcal{D} = \\left\\{ \\left(x^{(i)}, y^{(i)}\\right) \\right\\}_{i=1}^m, \\quad f: \\mathcal{X} \\to \\mathcal{Y}, \\quad \\hat{y}^{(i)} = f(x^{(i)})',
          explanation:
            'A supervised algorithm takes a dataset D of m input-output pairs and learns a mapping function f that accurately predicts targets y from features x.',
        },
      ],
      pythonSnippet: {
        title: 'Verifying Mitchell ML Paradigm with Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'A complete runnable example demonstrating Supervised Learning: defining feature matrix X and target vector y, fitting an estimator, and measuring performance P.',
        code: `import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# 1. Experience E: Synthetic dataset of study hours vs exam scores
np.random.seed(42)
m_samples = 100
# Feature Matrix X (m x n) where n=1 (Hours Studied)
X = np.random.uniform(1.0, 10.0, size=(m_samples, 1))
# Target Vector y (m x 1): True relationship y = 8.5 * X + 15 + Gaussian Noise
noise = np.random.normal(0, 3.5, size=(m_samples, 1))
y = 8.5 * X + 15 + noise

# 2. Split Experience into Training and Evaluation sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Task T: Learn mapping function f(x) = w*x + b
model = LinearRegression()
model.fit(X_train, y_train)

# 4. Performance P: Evaluate prediction accuracy on unseen test set
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("=== Machine Learning Paradigm Verification ===")
print(f"Learned Weight (w): {model.coef_[0][0]:.3f} (True: 8.500)")
print(f"Learned Bias   (b): {model.intercept_[0]:.3f} (True: 15.000)")
print(f"Performance P (MSE)     : {mse:.3f}")
print(f"Performance P (R2 Score): {r2:.3f}")`,
      },
      keyTakeaways: [
        'ML is fundamentally about generalizing to unseen data, not memorizing historical training points.',
        'Supervised learning requires ground-truth labels y; Unsupervised learning finds latent patterns without labels.',
        'Regression predicts continuous quantities; Classification predicts discrete categorical buckets.',
        'Every ML pipeline transforms an input feature matrix X of shape (m, n) into predictions y_hat.',
      ],
      prosAndCons: {
        pros: [
          'Solves complex problems (vision, speech, translation) that are impossible to hardcode with rule-based heuristics.',
          'Continuously improves in accuracy as more data experience E is collected.',
          'Discovers non-linear, high-dimensional interactions between features that humans cannot visualize.',
        ],
        cons: [
          'Garbage in, garbage out: models faithfully learn and amplify biases in training datasets.',
          'Requires substantial clean, labeled data (expensive human annotation).',
          'Black-box behavior: complex deep learning models lack straightforward interpretability.',
        ],
      },
      interviewPrep: [
        {
          question: 'What is the formal definition of Machine Learning according to Tom Mitchell?',
          answer:
            'A computer program is said to learn from experience E with respect to some class of tasks T and performance measure P, if its performance at tasks in T, as measured by P, improves with experience E.',
          trapOrTip:
            'Always illustrate your answer by naming T, E, and P for a specific concrete example (e.g. spam filtering or chess playing). Interviewers look for immediate practical application.',
        },
        {
          question: 'What is the primary difference between Supervised and Unsupervised Learning?',
          answer:
            'Supervised learning trains on labeled pairs (x, y) with explicit ground truth feedback to learn an input-output mapping function f: X -> Y. Unsupervised learning operates on unlabeled inputs X alone to discover inherent structure, groupings, or lower-dimensional representations without target guidance.',
          trapOrTip:
            'Do not forget to mention that Supervised learning splits into Regression and Classification, while Unsupervised learning splits into Clustering and Dimensionality Reduction.',
        },
      ],
    },
    {
      id: 'numpy_arrays',
      tierId: 'tier1',
      title: 'NumPy for ML: Vectorization, Ndarrays & Memory Strides',
      category: 'Foundations & Stack',
      difficulty: 'Beginner',
      summary:
        'Understand N-dimensional arrays (ndarrays), memory layout, broadcasting rules, and vectorization eliminating slow Python loops.',
      estimatedMinutes: 25,
      tags: ['NumPy', 'Arrays', 'Vectorization', 'Broadcasting', 'SIMD'],
      intuition:
        'Imagine doing math on an entire spreadsheet column at once instead of typing a formula into each cell one row at a time. Standard Python loops are like an office clerk opening a drawer, inspecting a file, checking its color, and doing math one page at a time. NumPy is like a high-speed industrial printing press that processes a million numbers in a single mechanical stroke using optimized C and CPU hardware instructions.',
      technicalExplanation:
        '### 1. Memory Layout: Python Lists vs NumPy ndarrays\n\nA Python `list` is an array of **pointers** to scattered `PyObject` structures in memory. Each element requires type inspection, reference counting, and garbage collection metadata (at least 28 bytes for a single integer). Iterating over a Python list causes frequent CPU L1/L2 cache misses.\n\nA NumPy `ndarray` is a **contiguous block of homogeneously typed memory** (e.g. 64-bit floating point numbers, 8 bytes each). It is described by:\n- **`dtype`**: The exact primitive data type (e.g. `float64`, `int32`).\n- **`shape`**: A tuple of integers describing array dimensions (e.g. `(1000, 50)`).\n- **`strides`**: A tuple of byte steps required to move to the next item along each axis.\n\n---\n\n### 2. The Vectorization & SIMD Advantage\n\nVectorization replaces explicit Python `for` loops with compiled C/Fortran routines. Modern x86 and ARM CPUs feature **SIMD (Single Instruction, Multiple Data)** instructions (such as AVX-512, AVX2, NEON), which load 4, 8, or 16 numbers into wide vector registers and add or multiply them in a single clock cycle.\n\n---\n\n### 3. The 3 Golden Rules of NumPy Broadcasting\n\nWhen operating on two arrays $A$ and $B$ of different shapes, NumPy applies broadcasting to avoid copying data in memory:\n1. **Rank Alignment**: If arrays have different numbers of dimensions, prepend 1s to the smaller shape until ranks match.\n2. **Dimension Compatibility**: Along each axis, dimensions match if they are **equal**, or if **one of them is 1**.\n3. **Stretch along Size 1**: Any axis of size 1 behaves as if it were repeated to match the larger dimension without actual memory allocation.',
      mathFormulas: [
        {
          title: 'Memory Stride Indexing Equation',
          latex: '\\text{ByteOffset}(i_0, i_1, \\dots, i_{k-1}) = \\sum_{d=0}^{k-1} i_d \\cdot s_d',
          explanation:
            'Locating element (i_0, ..., i_{k-1}) in contiguous memory takes a single fast affine multiply-add where s_d is the byte stride along axis d.',
        },
        {
          title: 'Broadcasting Compatibility Rule',
          latex: '\\text{Compatible}(d_A, d_B) \\iff (d_A = d_B) \\lor (d_A = 1) \\lor (d_B = 1)',
          explanation:
            'Two array dimensions are mathematically compatible for element-wise operations if they are identical or if either equals 1.',
        },
      ],
      pythonSnippet: {
        title: 'NumPy Vectorization Speed Benchmarking & Broadcasting',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates why vectorized array operations are 50x to 100x faster than standard Python loops and illustrates 2D broadcasting.',
        code: `import numpy as np
import time

# 1. Performance Benchmark: Vectorized vs Python Loop
N = 1_000_000
arr_a = np.random.rand(N)
arr_b = np.random.rand(N)

# Python Loop approach
start = time.perf_counter()
loop_result = [arr_a[i] * arr_b[i] for i in range(N)]
loop_time = time.perf_counter() - start

# NumPy Vectorized approach (C + SIMD)
start = time.perf_counter()
vec_result = arr_a * arr_b
vec_time = time.perf_counter() - start

print(f"Python Loop Time: {loop_time*1000:.2f} ms")
print(f"NumPy Vector Time: {vec_time*1000:.2f} ms")
print(f"Speedup Factor: {loop_time / vec_time:.1f}x faster!\\n")

# 2. Broadcasting in Action (Matrix Normalization)
# Feature matrix: 4 samples, 3 features
X = np.array([
    [10.0, 200.0, 0.5],
    [15.0, 350.0, 0.7],
    [12.0, 180.0, 0.3],
    [20.0, 500.0, 0.9]
])

# Compute mean per feature column (shape: (3,)) -> broadcasts to (4, 3)
means = np.mean(X, axis=0)
stds = np.std(X, axis=0)
X_standardized = (X - means) / stds

print("Original Feature Matrix:\\n", X)
print("\\nColumn Means (shape (3,)):", means)
print("\\nZ-Score Standardized Matrix (zero mean, unit variance):\\n", np.round(X_standardized, 2))`,
      },
      keyTakeaways: [
        'Never write an explicit Python `for` loop across dataset rows when an element-wise NumPy operation exists.',
        'Broadcasting aligns dimensions from right to left (trailing dimensions first).',
        'NumPy slicing creates memory views, not copies; modifying a slice mutates the underlying original array.',
        'Use `np.ascontiguousarray()` when interoperating with low-level C libraries or PyTorch tensors.',
      ],
      prosAndCons: {
        pros: [
          'Blazing execution speed powered by BLAS/LAPACK and SIMD hardware acceleration.',
          'Universal lingua franca across Scikit-Learn, PyTorch, TensorFlow, and SciPy.',
          'Minimal memory overhead compared to nested Python objects.',
        ],
        cons: [
          'Homogeneous types only (cannot mix strings and floats in a single array).',
          'Array dimensions cannot be resized dynamically in place without allocating a fresh buffer.',
        ],
      },
      interviewPrep: [
        {
          question: 'Why is NumPy dramatically faster than native Python lists?',
          answer:
            'NumPy arrays are contiguous, homogeneously-typed memory buffers. This enables CPU cache line locality (L1/L2 caches are saturated without cache misses), eliminates Python dynamic type-checking overhead per item, and executes vectorized C/Fortran SIMD assembly instructions that compute multiple elements per clock cycle.',
          trapOrTip:
            'Mention CPU cache lines (spatial locality) and pointer dereferencing overhead for senior-level credibility.',
        },
      ],
    },
    {
      id: 'pandas_wrangling',
      tierId: 'tier1',
      title: 'Pandas for ML: DataFrames, Tabular Wrangling & Cleaning',
      category: 'Foundations & Stack',
      difficulty: 'Beginner',
      summary:
        'Filter, group, merge, reshape, and clean structured real-world datasets with Pandas DataFrames and Series.',
      estimatedMinutes: 25,
      tags: ['Pandas', 'DataFrames', 'GroupBy', 'Data Wrangling', 'Data Cleaning'],
      intuition:
        'Think of Pandas as Excel with programmatic superpower: you can ingest millions of rows in seconds, handle missing values systematically, merge separate database tables like SQL joins, and aggregate metrics with clean, chainable syntax.',
      technicalExplanation:
        '### 1. Data Structures: Series vs DataFrame\n\n- **`Series`**: A 1D labeled array capable of holding any data type, backed by a NumPy array and an `Index`.\n- **`DataFrame`**: A 2D tabular data structure with labeled axes (rows and columns), essentially an aligned dictionary of Series sharing a common row index.\n\n---\n\n### 2. Indexing and Slicing: `loc` vs `iloc`\n\n- **`df.loc[...]`**: **Label-based** indexing. Slices are inclusive of both endpoints (`df.loc[0:5]` includes row label 5).\n- **`df.iloc[...]`**: **Integer position-based** indexing. Slices follow Python half-open semantics (`df.iloc[0:5]` yields indices 0, 1, 2, 3, 4).\n\n---\n\n### 3. The Split-Apply-Combine Strategy (`groupby`)\n\nCoined by Hadley Wickham, `df.groupby()` operates in 3 steps:\n1. **Split**: Break data into distinct subsets based on categorical keys.\n2. **Apply**: Execute an aggregation function (e.g. `mean`, `sum`, `count`), transformation, or filtration on each group independently.\n3. **Combine**: Merge the group results into a consolidated summary DataFrame.\n\n---\n\n### 4. Handling Missing Data (`NaN`)\n\nReal-world data is dirty. Missing values (`np.nan` or `None`) must be resolved before model fitting:\n- **Listwise Deletion (`dropna`)**: Dropping rows or columns containing missing values. Efficient only if missingness is completely at random and sample count is large.\n- **Imputation (`fillna` / `SimpleImputer`)**:\n  - Numerical columns: impute using **Median** (robust to outliers) or **Mean**.\n  - Categorical columns: impute using **Mode** (most frequent value) or a dedicated `"Missing"` token.',
      mathFormulas: [
        {
          title: 'Split-Apply-Combine GroupBy Mapping',
          latex: 'f(\\mathcal{D}) = \\bigoplus_{k \\in \\mathcal{K}} g\\left( \\{ x \\in \\mathcal{D} \\mid \\text{key}(x) = k \\} \\right)',
          explanation:
            'GroupBy partitions dataset D into subsets matching key k, applies aggregation g, and reduces results via direct concatenation.',
        },
      ],
      pythonSnippet: {
        title: 'Complete Tabular Data Cleaning & Aggregation Pipeline',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates creating a DataFrame, identifying missing data, imputing values, creating new features, and running groupby aggregations.',
        code: `import pandas as pd
import numpy as np

# 1. Create a realistic student study dataset with missing values
raw_data = {
    'Student_ID': [101, 102, 103, 104, 105, 106, 107, 108],
    'Major': ['CS', 'Math', 'CS', 'Physics', 'Math', 'CS', np.nan, 'Physics'],
    'Study_Hours': [12.5, np.nan, 8.0, 15.0, 5.5, 14.0, 9.5, 11.0],
    'Exam_Score': [88, 72, 65, 95, 60, 91, 78, 84],
    'Completed_Labs': [10, 8, 6, 10, 5, 9, 7, 8]
}
df = pd.DataFrame(raw_data)
print("=== Initial Raw DataFrame ===")
print(df)

# 2. Check missing values
print("\\nMissing Count per column:\\n", df.isnull().sum())

# 3. Impute Missing Values:
# Median for numerical 'Study_Hours', Mode for categorical 'Major'
median_hours = df['Study_Hours'].median()
df['Study_Hours'] = df['Study_Hours'].fillna(median_hours)
mode_major = df['Major'].mode()[0]
df['Major'] = df['Major'].fillna(mode_major)

# 4. Feature Engineering: Efficiency ratio
df['Score_Per_Hour'] = (df['Exam_Score'] / df['Study_Hours']).round(2)

# 5. Split-Apply-Combine: Group by Major
major_summary = df.groupby('Major').agg(
    Student_Count=('Student_ID', 'count'),
    Avg_Hours=('Study_Hours', 'mean'),
    Avg_Score=('Exam_Score', 'mean'),
    Top_Score=('Exam_Score', 'max')
).round(2)

print("\\n=== Major Summary (Aggregated) ===")
print(major_summary)`,
      },
      keyTakeaways: [
        'Use `.loc` for column names and row labels; use `.iloc` for strict integer offset positions.',
        'Never impute missing values using test set statistics — compute imputation statistics solely on training splits to prevent data leakage.',
        'Prefer Median over Mean for imputing skewed features with extreme outliers.',
        'Chaining operations with `.pipe()` and `.assign()` produces clean, reproducible data wrangling code.',
      ],
      prosAndCons: {
        pros: [
          'Unrivaled expressive API for tabular data exploration, grouping, and cleaning.',
          'Seamless integration with Scikit-Learn pipelines and CSV/SQL/Parquet formats.',
          'Rich datetime indexing and rolling window analytics.',
        ],
        cons: [
          'High memory consumption (typically 5x to 10x the raw file size in RAM).',
          'Single-threaded execution (use Polars or DuckDB for multi-core scaling on massive tables).',
        ],
      },
      interviewPrep: [
        {
          question: 'What is the difference between loc and iloc in Pandas?',
          answer:
            'df.loc[] is label-based indexing where both endpoints are inclusive (e.g. df.loc[0:2] returns rows labeled 0, 1, and 2). df.iloc[] is integer position-based indexing following standard Python half-open intervals [start, stop) (e.g. df.iloc[0:2] returns the 0th and 1st row).',
          trapOrTip:
            'Point out that if a DataFrame has an index of non-sequential numbers or strings, df.loc[0] searches for the label 0, whereas df.iloc[0] returns the very first row regardless of label.',
        },
      ],
    },
    {
      id: 'eda_preprocessing',
      tierId: 'tier1',
      title: 'Exploratory Data Analysis (EDA) & Feature Preprocessing',
      category: 'Foundations & Stack',
      difficulty: 'Beginner',
      summary:
        'Data types, encoding categorical variables (One-Hot vs Ordinal), feature scaling (StandardScaler vs MinMaxScaler), and Tukey IQR outlier detection.',
      estimatedMinutes: 30,
      tags: ['EDA', 'Preprocessing', 'StandardScaler', 'OneHotEncoder', 'Outliers', 'IQR'],
      intuition:
        'Machine learning models are mathematical engines: they cannot read words like "New York" or "Tokyo", and if one feature is measured in millions of dollars while another is measured in decimals (0.1 to 0.5), the model will mistakenly believe the million-dollar feature is millions of times more important. Preprocessing translates and normalizes raw messy data into balanced numbers that algorithms can learn from fairly.',
      technicalExplanation:
        '### 1. Data Type Taxonomies\n\n- **Numerical Variables**:\n  - **Continuous**: Can take any real value in an interval (e.g. house area $1845.5\\text{ sq ft}$, temperature, salary).\n  - **Discrete**: Integer counts (e.g. number of bedrooms $3$, number of past hospital visits $2$).\n- **Categorical Variables**:\n  - **Nominal**: Unordered distinct classes (e.g. City: `[London, Paris, Berlin]`, Blood Type: `[A, B, AB, O]`). Must be encoded using **One-Hot Encoding**.\n  - **Ordinal**: Categorical classes with a natural rank/order (e.g. Education: `[High School, Bachelors, Masters, PhD]`, Rating: `[Low, Medium, High]`). Encoded using **Ordinal Encoding** preserving integer progression.\n\n---\n\n### 2. Feature Scaling: Why & When?\n\nAlgorithms that rely on distance calculations (k-NN, SVM, K-Means) or gradient descent updates (Linear/Logistic Regression, Neural Networks) are severely damaged by unscaled features:\n- **Z-Score Standardization (`StandardScaler`)**:\n  $$z = \\frac{x - \\mu}{\\sigma}$$\n  Centers features to mean $\\mu = 0$ and scales variance to $\\sigma^2 = 1$. Preserves outlier presence without bounding.\n- **Min-Max Normalization (`MinMaxScaler`)**:\n  $$x_{\\text{norm}} = \\frac{x - x_{\\min}}{x_{\\max} - x_{\\min}}$$\n  Compresses all values strictly into the interval $[0, 1]$. Highly sensitive to outliers (one massive outlier compresses all other points into a microscopic range).\n- **Tree-Based Invariance**: Decision Trees, Random Forests, and XGBoost are **scale-invariant**; scaling does not affect tree splits.\n\n---\n\n### 3. Outlier Detection: Tukey’s Interquartile Range (IQR)\n\nAn outlier is an extreme observation deviating significantly from the overall pattern. John Tukey defined fences based on quartiles:\n- First Quartile ($Q_1$): 25th percentile.\n- Third Quartile ($Q_3$): 75th percentile.\n- $\\text{IQR} = Q_3 - Q_1$.\n- **Lower Fence**: $Q_1 - 1.5 \\times \\text{IQR}$.\n- **Upper Fence**: $Q_3 + 1.5 \\times \\text{IQR}$. Any point outside is flagged as an outlier.',
      mathFormulas: [
        {
          title: 'StandardScaler (Z-Score)',
          latex: 'z = \\frac{x - \\mu}{\\sigma}, \\quad \\mu = \\frac{1}{m}\\sum_{i=1}^m x^{(i)}, \\quad \\sigma = \\sqrt{\\frac{1}{m}\\sum_{i=1}^m (x^{(i)} - \\mu)^2}',
          explanation:
            'Centers feature distribution at 0 and rescales standard deviation to 1. Essential for distance-based models.',
        },
        {
          title: 'Tukey IQR Outlier Thresholds',
          latex: '\\text{Outlier}(x) \\iff x < Q_1 - 1.5 \\cdot \\text{IQR} \\quad \\lor \\quad x > Q_3 + 1.5 \\cdot \\text{IQR}',
          explanation:
            'Points lying beyond 1.5 times the interquartile range from either quartile are mathematically classified as statistical outliers.',
        },
      ],
      pythonSnippet: {
        title: 'Production Preprocessing: Scaling, Encoding & Outlier Removal',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates Scikit-Learn ColumnTransformer combining StandardScaler for numerical features and OneHotEncoder for categorical features.',
        code: `import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer

# 1. Raw Dataset
df = pd.DataFrame({
    'City': ['London', 'Paris', 'London', 'Berlin', 'Paris'],
    'Experience_Years': [2.0, 5.0, 1.0, 10.0, 3.0],
    'Annual_Salary': [45000, 68000, 42000, 120000, 52000]
})
print("=== Raw Data ===\\n", df)

# 2. Outlier Detection using IQR on Salary
q1 = df['Annual_Salary'].quantile(0.25)
q3 = df['Annual_Salary'].quantile(0.75)
iqr = q3 - q1
lower_bound = q1 - 1.5 * iqr
upper_bound = q3 + 1.5 * iqr
print(f"\\nIQR Fences: Lower = {lower_bound}, Upper = {upper_bound}")

# 3. Scikit-Learn ColumnTransformer Pipeline
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), ['Experience_Years', 'Annual_Salary']),
        ('cat', OneHotEncoder(drop='first', sparse_output=False), ['City'])
    ]
)

# Fit and transform
processed_array = preprocessor.fit_transform(df)
feature_names = preprocessor.get_feature_names_out()
df_processed = pd.DataFrame(processed_array, columns=feature_names)

print("\\n=== Transformed Feature Matrix for ML ===")
print(df_processed.round(3))`,
      },
      keyTakeaways: [
        'Always fit scalers and encoders ONLY on the training split (`fit_transform`), then call `.transform()` on test/validation sets to avoid data leakage.',
        'Use One-Hot Encoding for nominal categories and Ordinal Encoding when categories possess meaningful hierarchy.',
        'StandardScaler is robust to moderate outliers; MinMaxScaler is severely warped by extreme values.',
        'Tree-based models do not require feature scaling, but linear models, SVMs, and neural networks require it.',
      ],
      prosAndCons: {
        pros: [
          'Accelerates gradient descent convergence from elliptical contours into spherical contours.',
          'Ensures fair feature contribution in distance metrics (Euclidean, Manhattan).',
          'Eliminates numerical instability and overflow in exponentiated loss functions.',
        ],
        cons: [
          'One-Hot Encoding high-cardinality features (e.g. Zip codes) causes catastrophic dimensionality explosion.',
          'Standardization destroys natural zero-sparsity in sparse matrices (use `MaxAbsScaler` instead).',
        ],
      },
      interviewPrep: [
        {
          question: 'Why do we need feature scaling, and which algorithms require it?',
          answer:
            'Features with large numeric ranges dominate distance computations and cause gradient descent to oscillate inefficiently along narrow elongated ravines. Distance-based algorithms (k-NN, SVM, K-Means) and gradient-descent algorithms (Linear/Logistic Regression, Neural Networks) require scaling. Decision trees and tree ensembles are invariant to monotonic transformations and do not require scaling.',
          trapOrTip:
            'Always point out that failing to scale features in k-NN causes features with large values to completely drown out features with small values.',
        },
      ],
    },
  ],
};
