/**
 * StudyQuest AI — Curated Machine Learning Lab Notebook Templates
 * Derived from the 4 premier open-source resources:
 * - Jake VanderPlas' Python Data Science Handbook (O'Reilly)
 * - Brendan Fortuner's Machine Learning Glossary (ml-cheatsheet)
 * - Microsoft's ML-For-Beginners Curriculum
 * - Zendin's Mathematics for Machine Learning
 */

import { Notebook } from '@/types/notebook';

export interface MlLabTemplate {
  id: string;
  title: string;
  subtitle: string;
  sourceRepo: string;
  author: string;
  tierId: string;
  estimatedMinutes: number;
  tags: string[];
  notebook: Notebook;
}

export const ML_LAB_TEMPLATES: MlLabTemplate[] = [
  {
    id: 'lab_vanderplas_numpy_pandas',
    title: 'NumPy & Pandas High-Performance Computing Lab',
    subtitle: 'Array broadcasting, memory strides, and vectorized aggregation',
    sourceRepo: 'https://github.com/jakevdp/PythonDataScienceHandbook',
    author: 'Jake VanderPlas',
    tierId: 'tier1',
    estimatedMinutes: 25,
    tags: ['NumPy', 'Pandas', 'Vectorization', 'Data Wrangling'],
    notebook: {
      id: 'nb_vanderplas_numpy_pandas',
      title: 'Lab: NumPy & Pandas Foundations (Jake VanderPlas)',
      folderId: null,
      cells: [
        {
          id: 'cell_vnp_1',
          cell_type: 'markdown',
          source: `# Python Data Science Handbook: NumPy & Pandas Foundations
*Curated from Jake VanderPlas's open-source classic*

In this lab, you will explore:
1. Contiguous memory layouts and vectorized operations vs Python loops
2. Multi-dimensional array broadcasting mechanics
3. High-performance indexing and conditional boolean masks
4. Tabular data transformations with Pandas \`.groupby()\` and pivot tables`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
        {
          id: 'cell_vnp_2',
          cell_type: 'code',
          source: `import numpy as np
import pandas as pd

# 1. Understanding NumPy Broadcasting
# Rule: Dimensions match if they are equal or if one of them is 1
A = np.arange(3).reshape((3, 1))  # Shape (3, 1)
B = np.arange(3)                   # Shape (3,) -> broadcasts to (1, 3)

print("A (3x1):\\n", A)
print("B (1x3):\\n", B)
print("A + B (3x3 outer addition):\\n", A + B)`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
        {
          id: 'cell_vnp_3',
          cell_type: 'code',
          source: `# 2. Boolean Masking and Aggregation
np.random.seed(42)
temperatures = np.random.normal(loc=25.0, scale=6.0, size=365)

# Calculate extreme heat days (> 32 degrees)
hot_days = temperatures[temperatures > 32.0]
print(f"Total days analyzed: {len(temperatures)}")
print(f"Days exceeding 32°C: {len(hot_days)}")
print(f"Mean temp on hottest days: {hot_days.mean():.2f}°C")
print(f"Standard deviation: {temperatures.std():.2f}°C")`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
        {
          id: 'cell_vnp_4',
          cell_type: 'code',
          source: `# 3. Pandas Split-Apply-Combine Pattern
data = {
    'Student': ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan', 'Fiona'],
    'Department': ['CS', 'EE', 'CS', 'Math', 'EE', 'Math'],
    'Semester': [1, 2, 1, 3, 2, 3],
    'Score': [94, 82, 88, 91, 79, 95]
}
df = pd.DataFrame(data)

summary = df.groupby('Department')['Score'].agg(['count', 'mean', 'max', 'std'])
print("Department Score Aggregations:")
print(summary)`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
      ],
      metadata: {
        kernelspec: { display_name: 'Python 3 (Pyodide WASM)', language: 'python', name: 'python3' },
        language_info: { name: 'python', version: '3.11.0' },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  },
  {
    id: 'lab_fortuner_backprop_scratch',
    title: 'Neural Network & Backpropagation from Scratch',
    subtitle: 'Matrix calculus, forward pass, activation functions, and gradient descent',
    sourceRepo: 'https://github.com/bfortuner/ml-glossary',
    author: 'Brendan Fortuner',
    tierId: 'tier7',
    estimatedMinutes: 30,
    tags: ['Neural Networks', 'Backprop', 'Matrix Calculus', 'NumPy'],
    notebook: {
      id: 'nb_fortuner_backprop_scratch',
      title: 'Lab: Backprop from Scratch (Brendan Fortuner)',
      folderId: null,
      cells: [
        {
          id: 'cell_fbp_1',
          cell_type: 'markdown',
          source: `# Brendan Fortuner's ML Glossary: Neural Networks from Scratch
*Pure NumPy implementation of Forward Pass, Sigmoid/ReLU activations, Cross-Entropy Loss, and Backpropagation.*

$$\\frac{\\partial \\mathcal{L}}{\\partial W_2} = A_1^T \\cdot \\delta_2, \\quad \\delta_2 = (A_2 - Y)$$
$$\\frac{\\partial \\mathcal{L}}{\\partial W_1} = X^T \\cdot (\\delta_2 W_2^T \\odot \\sigma'(Z_1))$$`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
        {
          id: 'cell_fbp_2',
          cell_type: 'code',
          source: `import numpy as np

# Numerically stable Sigmoid & its derivative
def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -250, 250)))

def sigmoid_derivative(a):
    return a * (1.0 - a)

# Binary Cross-Entropy Loss
def compute_loss(y_true, y_pred):
    eps = 1e-15
    y_pred = np.clip(y_pred, eps, 1.0 - eps)
    return -np.mean(y_true * np.log(y_pred) + (1.0 - y_true) * np.log(1.0 - y_pred))

# Synthetic XOR Problem (Non-linearly separable)
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
Y = np.array([[0], [1], [1], [0]])

# Initialize 2-layer Neural Network (2 -> 4 -> 1)
np.random.seed(42)
W1 = np.random.randn(2, 4) * 0.5
b1 = np.zeros((1, 4))
W2 = np.random.randn(4, 1) * 0.5
b2 = np.zeros((1, 1))

lr = 0.5
epochs = 2000

for epoch in range(epochs):
    # Forward Pass
    Z1 = np.dot(X, W1) + b1
    A1 = sigmoid(Z1)
    Z2 = np.dot(A1, W2) + b2
    A2 = sigmoid(Z2)
    
    # Backward Pass (Chain Rule Matrix Calculus)
    dZ2 = A2 - Y
    dW2 = np.dot(A1.T, dZ2) / len(X)
    db2 = np.sum(dZ2, axis=0, keepdims=True) / len(X)
    
    dZ1 = np.dot(dZ2, W2.T) * sigmoid_derivative(A1)
    dW1 = np.dot(X.T, dZ1) / len(X)
    db1 = np.sum(dZ1, axis=0, keepdims=True) / len(X)
    
    # Parameter Updates
    W2 -= lr * dW2
    b2 -= lr * db2
    W1 -= lr * dW1
    b1 -= lr * db1
    
    if epoch % 500 == 0:
        loss = compute_loss(Y, A2)
        print(f"Epoch {epoch:4d} | Loss: {loss:.5f}")

print("\\nFinal Predictions on XOR:")
for i in range(len(X)):
    print(f"Input: {X[i]} -> Target: {Y[i][0]} | Predicted: {A2[i][0]:.4f}")`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
      ],
      metadata: {
        kernelspec: { display_name: 'Python 3 (Pyodide WASM)', language: 'python', name: 'python3' },
        language_info: { name: 'python', version: '3.11.0' },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  },
  {
    id: 'lab_vanderplas_svm_rf',
    title: 'Support Vector Machines & Random Forests Lab',
    subtitle: 'Maximal margin classification, kernel trick, and ensemble bagging',
    sourceRepo: 'https://github.com/jakevdp/PythonDataScienceHandbook',
    author: 'Jake VanderPlas',
    tierId: 'tier3',
    estimatedMinutes: 25,
    tags: ['SVM', 'Random Forest', 'Scikit-Learn', 'Classification'],
    notebook: {
      id: 'nb_vanderplas_svm_rf',
      title: 'Lab: SVM & Random Forests (Jake VanderPlas)',
      folderId: null,
      cells: [
        {
          id: 'cell_svm_1',
          cell_type: 'markdown',
          source: `# Jake VanderPlas: Support Vector Machines & Random Forests
*Understanding Maximal Margins, Support Vectors, and Ensemble Trees using Scikit-Learn.*`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
        {
          id: 'cell_svm_2',
          cell_type: 'code',
          source: `from sklearn.datasets import make_blobs, make_classification
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Generate synthetic dataset
X, y = make_classification(n_samples=300, n_features=4, n_informative=3, n_redundant=1, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

# 1. Train Support Vector Classifier with RBF Kernel
svm_model = SVC(kernel='rbf', C=1.0, gamma='scale')
svm_model.fit(X_train, y_train)
svm_preds = svm_model.predict(X_test)
print(f"SVM Test Accuracy: {accuracy_score(y_test, svm_preds)*100:.2f}%")
print(f"Number of Support Vectors: {len(svm_model.support_)}")

# 2. Train Random Forest Classifier
rf_model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
rf_model.fit(X_train, y_train)
rf_preds = rf_model.predict(X_test)
print(f"Random Forest Test Accuracy: {accuracy_score(y_test, rf_preds)*100:.2f}%")
print("Random Forest Feature Importances:", rf_model.feature_importances_)`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
      ],
      metadata: {
        kernelspec: { display_name: 'Python 3 (Pyodide WASM)', language: 'python', name: 'python3' },
        language_info: { name: 'python', version: '3.11.0' },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  },
  {
    id: 'lab_microsoft_model_evaluation',
    title: 'Model Evaluation, ROC-AUC & Calibration Lab',
    subtitle: 'Confusion matrices, precision-recall curves, and threshold tuning',
    sourceRepo: 'https://github.com/microsoft/ML-For-Beginners',
    author: 'Microsoft ML Curriculum',
    tierId: 'tier4',
    estimatedMinutes: 20,
    tags: ['Evaluation', 'Metrics', 'ROC-AUC', 'Precision-Recall'],
    notebook: {
      id: 'nb_microsoft_model_evaluation',
      title: 'Lab: Evaluation & ROC Curves (Microsoft ML)',
      folderId: null,
      cells: [
        {
          id: 'cell_ms_1',
          cell_type: 'markdown',
          source: `# Microsoft ML-For-Beginners: Model Evaluation & ROC-AUC
*Learn to diagnose classification performance beyond naive accuracy.*`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
        {
          id: 'cell_ms_2',
          cell_type: 'code',
          source: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, roc_auc_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

# Generate imbalanced dataset (90% negative, 10% positive)
X, y = make_classification(n_samples=1000, n_classes=2, weights=[0.90, 0.10], random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

model = LogisticRegression()
model.fit(X_train, y_train)

y_prob = model.predict_proba(X_test)[:, 1]
y_pred = (y_prob >= 0.5).astype(int)

cm = confusion_matrix(y_test, y_pred)
print("Confusion Matrix:")
print(f"[[TN={cm[0,0]}, FP={cm[0,1]}],\\n [FN={cm[1,0]}, TP={cm[1,1]}]]")
print(f"\\nPrecision: {precision_score(y_test, y_pred):.3f}")
print(f"Recall:    {recall_score(y_test, y_pred):.3f}")
print(f"F1-Score:  {f1_score(y_test, y_pred):.3f}")
print(f"ROC-AUC:   {roc_auc_score(y_test, y_prob):.3f}")`,
          execution_count: null,
          outputs: [],
          status: 'idle',
        },
      ],
      metadata: {
        kernelspec: { display_name: 'Python 3 (Pyodide WASM)', language: 'python', name: 'python3' },
        language_info: { name: 'python', version: '3.11.0' },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  },
];
