import { MlTier } from '@/types/ml';

export const tier4Data: MlTier = {
  id: 'tier4',
  tierNumber: 4,
  title: 'Supervised Learning — Classification & Ensembles',
  subtitle: 'Logistic Regression, Metrics, k-NN, Naive Bayes, Support Vector Machines (SVC/SVR) & Trees',
  badge: 'Classification Mastery',
  difficulty: 'Intermediate',
  accentColor: '#f59e0b', // Amber
  description:
    'Master the complete arsenal of classification algorithms: odds ratios and the logistic sigmoid, confusion matrix diagnostics, lazy instance learning with k-NN, Bayesian generative classifiers, Support Vector Machines (SVC & SVR) with the kernel trick, and state-of-the-art tree ensembles (Random Forest and XGBoost).',
  concepts: [
    {
      id: 'logistic_regression',
      tierId: 'tier4',
      title: 'Introduction to Classification & Logistic Regression',
      category: 'Supervised Learning',
      difficulty: 'Beginner',
      summary:
        'Why linear regression fails for classification, the Odds Ratio and Logit, the Sigmoid activation, and Binary Cross-Entropy (Log-Loss).',
      estimatedMinutes: 30,
      tags: ['Classification', 'Logistic Regression', 'Sigmoid', 'Cross-Entropy', 'Log-Loss', 'Logit'],
      intuition:
        'Imagine predicting whether a patient has a medical condition (Yes or No). If you draw a straight line through the data like linear regression, your line might predict a value of -0.8 or +2.4. What does a probability of 240% or -80% even mean? It is nonsensical! Logistic regression bends that straight line into an elegant "S-curve" that is mathematically trapped strictly between 0% and 100%, turning scores into calibrated probabilities.',
      technicalExplanation:
        '### 1. Why Linear Regression Fails for Classification\n\nAttempting to fit Ordinary Least Squares ($y = w^T x + b$) to binary labels $y \\in \\{0, 1\\}$ fails for two major reasons:\n1. **Unbounded Predictions**: Linear regression outputs values from $-\\infty$ to $+\\infty$. Probabilities must strictly satisfy $p \\in [0, 1]$.\n2. **Sensitivity to Outliers**: Adding an extreme positive sample with a very large feature value shifts the entire linear decision boundary, causing valid positive samples to be misclassified.\n\n---\n\n### 2. The Odds Ratio & The Logit Function\n\nLet $p = P(y = 1 \\mid x)$ be the probability of the positive class:\n- **Odds Ratio**: $\\text{Odds} = \\frac{p}{1 - p}$ (ratio of success probability to failure probability, range: $[0, \\infty)$).\n- **Logit (Log-Odds)**: Taking the natural logarithm maps odds to the entire real line $(-\\infty, \\infty)$:\n  $$\\ln\\left( \\frac{p}{1 - p} \\right) = w^T x + b$$\n\n---\n\n### 3. The Sigmoid (Logistic) Function\n\nSolving for probability $p$ yields the celebrated **Sigmoid Activation Function**:\n$$p = \\sigma(z) = \\frac{1}{1 + e^{-z}} \\quad \\text{where } z = w^T x + b$$\nProperties of $\\sigma(z)$:\n- When $z = 0 \\implies \\sigma(0) = 0.5$.\n- As $z \\to +\\infty \\implies \\sigma(z) \\to 1.0$.\n- As $z \\to -\\infty \\implies \\sigma(z) \\to 0.0$.\n- **Derivative**: $\\frac{d\\sigma}{dz} = \\sigma(z)(1 - \\sigma(z))$.\n\n---\n\n### 4. Binary Cross-Entropy Loss (Log-Loss)\n\nWe cannot use Mean Squared Error with the sigmoid function because the resulting cost function is non-convex with numerous local minima. Instead, we derive the cost function using **Maximum Likelihood Estimation (MLE)**:\n$$\\mathcal{L}(w, b) = -\\frac{1}{m} \\sum_{i=1}^m \\left[ y^{(i)} \\ln(\\hat{p}^{(i)}) + (1 - y^{(i)}) \\ln(1 - \\hat{p}^{(i)}) \\right]$$\nwhere $\\hat{p}^{(i)} = \\sigma(w^T x^{(i)} + b)$.\n- If true label $y = 1$: Loss is $-\\ln(\\hat{p})$. As $\\hat{p} \\to 1$, loss $\\to 0$. As $\\hat{p} \\to 0$, loss $\\to \\infty$.\n- If true label $y = 0$: Loss is $-\\ln(1 - \\hat{p})$. As $\\hat{p} \\to 0$, loss $\\to 0$. As $\\hat{p} \\to 1$, loss $\\to \\infty$.',
      mathFormulas: [
        {
          title: 'The Logistic Sigmoid Function',
          latex: '\\sigma(z) = \\frac{1}{1 + e^{-z}} = \\frac{e^z}{e^z + 1}, \\quad z = w^T x + b',
          explanation:
            'Maps any real-valued linear input z into a well-calibrated probability bounded strictly in (0, 1).',
        },
        {
          title: 'Binary Cross-Entropy (Log-Loss)',
          latex: 'J(w, b) = -\\frac{1}{m} \\sum_{i=1}^m \\left[ y^{(i)} \\ln\\left(\\sigma(w^T x^{(i)} + b)\\right) + (1 - y^{(i)}) \\ln\\left(1 - \\sigma(w^T x^{(i)} + b)\\right) \\right]',
          explanation:
            'Convex loss function penalizing confident wrong predictions with logarithmic severity.',
        },
      ],
      pythonSnippet: {
        title: 'Logistic Regression with Scikit-Learn Pipeline',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates training a LogisticRegression model, inspecting predicted probabilities, and tuning the decision threshold.',
        code: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss

# 1. Synthetic Classification Data: Exam pass/fail based on study hours
X = np.array([[1.0], [1.5], [2.0], [2.5], [3.0], [4.0], [4.5], [5.0], [6.0], [8.0]])
y = np.array([0, 0, 0, 0, 1, 0, 1, 1, 1, 1]) # 0 = Fail, 1 = Pass

# 2. Train Logistic Regression
clf = LogisticRegression()
clf.fit(X, y)

# 3. Predict Probabilities
X_test = np.array([[2.2], [3.5], [7.0]])
probs = clf.predict_proba(X_test)
preds_default = clf.predict(X_test)

print("=== Logistic Regression Predictions ===")
for i, test_val in enumerate(X_test):
    print(f"Hours: {test_val[0]} -> P(Fail): {probs[i][0]:.3f}, P(Pass): {probs[i][1]:.3f} => Prediction: {preds_default[i]}")

# 4. Custom Decision Threshold (e.g. threshold = 0.4 for conservative prediction)
custom_threshold = 0.4
preds_custom = (probs[:, 1] >= custom_threshold).astype(int)
print(f"\\nPredictions with Custom Threshold {custom_threshold}: {preds_custom}")`,
      },
      keyTakeaways: [
        'Linear regression fails for classification due to unbounded outputs and extreme sensitivity to outliers.',
        'The Sigmoid function squashes (-inf, +inf) into valid probabilities (0, 1).',
        'Binary Cross-Entropy ensures the loss surface is strictly convex, guaranteeing gradient descent finds the global minimum.',
        'The default decision threshold is 0.5, but in medical or fraud applications, you tune the threshold based on precision-recall requirements.',
      ],
      prosAndCons: {
        pros: [
          'Outputs well-calibrated posterior probabilities, not just hard class labels.',
          'Coefficients represent multiplicative changes in the odds ratio (highly interpretable).',
        ],
        cons: [
          'Assumes linear decision boundaries; cannot separate non-linear data without feature transformations.',
          'Prone to severe degradation when features are multicollinear.',
        ],
      },
      interviewPrep: [
        {
          question: 'Why do we use Binary Cross-Entropy instead of Mean Squared Error in Logistic Regression?',
          answer:
            'When you compose the non-linear Sigmoid function sigma(z) with Mean Squared Error (y - sigma(z))^2, the resulting loss function is non-convex with numerous local minima and flat plateau regions where gradients vanish. In contrast, Binary Cross-Entropy derived from Maximum Likelihood Estimation is mathematically guaranteed to be strictly convex when combined with the sigmoid, ensuring that gradient descent converges to the unique global minimum.',
          trapOrTip:
            'Mention that Cross-Entropy penalizes confident wrong predictions with infinite loss, whereas MSE caps the maximum penalty for a completely wrong prediction at 1.0.',
        },
      ],
    },
    {
      id: 'classification_metrics',
      tierId: 'tier4',
      title: 'Classification Evaluation Metrics & The Confusion Matrix',
      category: 'Evaluation & Tuning',
      difficulty: 'Intermediate',
      summary:
        'The 2x2 Confusion Matrix (TP, TN, FP, FN), Accuracy Paradox, Precision, Recall, Specificity, F1-Score, and ROC-AUC analysis.',
      estimatedMinutes: 30,
      tags: ['Confusion Matrix', 'Precision', 'Recall', 'F1-Score', 'ROC-AUC', 'Classification Metrics'],
      intuition:
        'Imagine a medical test that always says "You do not have the rare disease" to every single patient. If only 1 out of 1,000 people has the disease, this completely useless test is 99.9% accurate! That is the Accuracy Paradox. High accuracy is completely meaningless when classes are imbalanced. We need a diagnostic toolkit — Precision, Recall, F1-score, and ROC-AUC — to measure what truly matters.',
      technicalExplanation:
        '### 1. The 2×2 Confusion Matrix\n\nFor a binary classification task with ground truth $y$ and prediction $\\hat{y}$:\n- **True Positive (TP)**: Model predicted 1, reality is 1 (Correct detection).\n- **True Negative (TN)**: Model predicted 0, reality is 0 (Correct rejection).\n- **False Positive (FP / Type I Error)**: Model predicted 1, reality is 0 ("False Alarm").\n- **False Negative (FN / Type II Error)**: Model predicted 0, reality is 1 ("Missed Detection").\n\n---\n\n### 2. Core Classification Metrics\n\n1. **Accuracy**: $\\frac{TP + TN}{TP + TN + FP + FN}$\n   - Misleading when class distributions are imbalanced.\n2. **Precision**: $\\frac{TP}{TP + FP}$\n   - *"Out of all samples predicted as positive, how many were actually positive?"*\n   - Critical when **False Positives are expensive** (e.g. spam filters marking an important job offer as spam).\n3. **Recall (Sensitivity / True Positive Rate)**: $\\frac{TP}{TP + FN}$\n   - *"Out of all actual positive samples in the real world, how many did we catch?"*\n   - Critical when **False Negatives are catastrophic** (e.g. malignant cancer detection, fraud detection).\n4. **Specificity (True Negative Rate)**: $\\frac{TN}{TN + FP}$\n   - Ratio of actual negatives correctly identified.\n5. **$F_1$-Score**: The harmonic mean of Precision and Recall:\n   $$F_1 = 2 \\cdot \\frac{\\text{Precision} \\cdot \\text{Recall}}{\\text{Precision} + \\text{Recall}} = \\frac{2 TP}{2 TP + FP + FN}$$\n   - Why harmonic mean? If either Precision or Recall approaches 0, the harmonic mean collapses to 0, penalizing extreme trade-offs.\n\n---\n\n### 3. The ROC Curve & ROC-AUC Score\n\n- **Receiver Operating Characteristic (ROC)**: A curve plotting **True Positive Rate (Recall)** against **False Positive Rate ($1 - \\text{Specificity}$)** across every possible decision threshold $\\tau \\in [0, 1]$.\n- **ROC-AUC (Area Under the Curve)**:\n  - **$\\text{AUC} = 1.0$**: Perfect classifier.\n  - **$\\text{AUC} = 0.5$**: Worthless coin-toss classifier.\n  - **Probabilistic Interpretation**: ROC-AUC equals the exact probability that the classifier ranks a randomly chosen positive sample higher than a randomly chosen negative sample!',
      mathFormulas: [
        {
          title: 'F1-Score (Harmonic Mean)',
          latex: 'F_1 = 2 \\cdot \\frac{\\text{Precision} \\times \\text{Recall}}{\\text{Precision} + \\text{Recall}} = \\frac{2 \\cdot TP}{2 \\cdot TP + FP + FN}',
          explanation:
            'Harmonic mean balances precision and recall, severely penalizing models that sacrifice one for the other.',
        },
        {
          title: 'False Positive Rate (FPR)',
          latex: '\\text{FPR} = \\frac{FP}{FP + TN} = 1 - \\text{Specificity}',
          explanation:
            'Proportion of actual negative instances falsely flagged as positive; plotted on x-axis of the ROC curve.',
        },
      ],
      pythonSnippet: {
        title: 'Comprehensive Confusion Matrix & Classification Report in Python',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates computing precision, recall, f1-score, confusion matrix, and ROC-AUC score on imbalanced class data.',
        code: `import numpy as np
from sklearn.metrics import (
    confusion_matrix, classification_report, 
    precision_score, recall_score, f1_score, roc_auc_score
)

# 1. Ground truth with class imbalance (90 negatives, 10 positives)
y_true = np.array([0]*90 + [1]*10)

# 2. Model A: Dummy classifier predicting all negatives (demonstrates accuracy paradox)
y_dummy = np.zeros(100)
print("=== The Accuracy Paradox Demonstrated ===")
print(f"Dummy Model Accuracy: {np.mean(y_true == y_dummy)*100:.1f}% (90% accurate, but caught 0 positive cases!)")

# 3. Model B: Realistic ML classifier probabilities
np.random.seed(42)
y_scores = np.concatenate([
    np.random.beta(1, 5, size=90), # Negatives receive mostly low probabilities
    np.random.beta(4, 2, size=10)  # Positives receive mostly high probabilities
])
y_pred = (y_scores >= 0.5).astype(int)

# 4. Confusion Matrix Breakdown
cm = confusion_matrix(y_true, y_pred)
tn, fp, fn, tp = cm.ravel()

print("\\n=== Model Confusion Matrix ===")
print(f"TN: {tn}, FP: {fp}")
print(f"FN: {fn}, TP: {tp}")
print(f"Precision: {precision_score(y_true, y_pred):.3f}")
print(f"Recall:    {recall_score(y_true, y_pred):.3f}")
print(f"F1 Score:  {f1_score(y_true, y_pred):.3f}")
print(f"ROC-AUC:   {roc_auc_score(y_true, y_scores):.3f}")`,
      },
      keyTakeaways: [
        'Never trust accuracy alone when evaluating imbalanced datasets.',
        'Precision answers "How reliable are positive predictions?"; Recall answers "Did we catch all positive cases?".',
        'Use F1-Score when you need a single balanced metric between Precision and Recall.',
        'ROC-AUC measures ranking discrimination capability independent of any single chosen decision threshold.',
      ],
      prosAndCons: {
        pros: [
          'Exposes exact trade-offs between false alarms and missed detections.',
          'ROC-AUC is invariant to prior class prevalence shifts.',
        ],
        cons: [
          'ROC curves can be overly optimistic under severe class imbalance (use Precision-Recall curves instead).',
        ],
      },
      interviewPrep: [
        {
          question: 'Why do we use the harmonic mean for F1-Score instead of the arithmetic mean?',
          answer:
            'The arithmetic mean of Precision and Recall treats them independently. A dummy classifier predicting everything as positive might achieve 100% recall and 1% precision, giving an arithmetic mean of (1.0 + 0.01) / 2 = 50.5%. The harmonic mean penalizes extreme imbalances: F1 = 2*(1.0*0.01)/(1.0 + 0.01) = 0.0198 (1.98%). The harmonic mean is dominated by the smaller number, ensuring that a high score is achieved only when both precision and recall are strong.',
          trapOrTip:
            'Be ready to write down the formula 2PR/(P+R) on a whiteboard immediately.',
        },
      ],
    },
    {
      id: 'knn_algorithm',
      tierId: 'tier4',
      title: 'k-Nearest Neighbors (k-NN) & Distance Metrics',
      category: 'Supervised Learning',
      difficulty: 'Beginner',
      summary:
        'Instance-based lazy learning, distance metrics (Euclidean, Manhattan, Minkowski), voting mechanisms, choosing k, and the Curse of Dimensionality.',
      estimatedMinutes: 25,
      tags: ['k-NN', 'Nearest Neighbors', 'Distance Metrics', 'Lazy Learning', 'Curse of Dimensionality'],
      intuition:
        'Imagine moving to a new neighborhood and wondering how to vote in the local election. You do not read every law from scratch; instead, you ask your 5 closest neighbors what they think, and you go with whatever the majority recommends. That is k-Nearest Neighbors: it does not learn an abstract formula; it simply stores the data and classifies new points based on their closest neighbors in space.',
      technicalExplanation:
        '### 1. Instance-Based "Lazy" Learning\n\nk-NN is a non-parametric, **lazy learning** algorithm:\n- **Training Phase ($O(1)$ time)**: There is no model fitting or weight optimization. The algorithm simply memorizes and stores the training dataset $\\mathcal{D}$.\n- **Inference Phase ($O(m \\cdot n)$ time)**: To classify a query point $x_q$, the algorithm computes the distance between $x_q$ and **every single sample** in the training set, sorts them, selects the $k$ closest neighbors, and takes a majority vote.\n\n---\n\n### 2. Distance Metrics: The Minkowski Family\n\nThe distance between two points $u, v \\in \\mathbb{R}^n$ is computed via the **Minkowski Distance**:\n$$D(u, v) = \\left( \\sum_{j=1}^n |u_j - v_j|^p \\right)^{1/p}$$\n- **$p = 1$ (Manhattan / $L_1$ Distance)**: $\\sum |u_j - v_j|$ (grid/taxicab geometry, robust to outliers).\n- **$p = 2$ (Euclidean / $L_2$ Distance)**: $\\sqrt{\\sum (u_j - v_j)^2}$ (straight-line distance).\n- **$p = \\infty$ (Chebyshev Distance)**: $\\max_j |u_j - v_j|$.\n\n---\n\n### 3. Choosing Hyperparameter $k$: Bias-Variance Tradeoff\n\n- **$k = 1$ (High Variance, Overfitting)**: The decision boundary wraps tightly around individual noisy training points. Zero training error, but jagged boundaries that fail to generalize.\n- **$k = m$ (High Bias, Underfitting)**: The model simply predicts the majority class of the entire dataset for every query point.\n- **Best Practice**: Choose an **odd integer** (e.g. $k = 3, 5, 7$) for binary classification to prevent voting ties, tuned via Cross-Validation.\n\n---\n\n### 4. Critical Requirements & Pitfalls\n\n1. **Feature Scaling is Mandatory**: If Feature 1 has values $[1000, 50000]$ and Feature 2 has values $[0.1, 0.9]$, Euclidean distance will be 99.99% determined by Feature 1, completely ignoring Feature 2!\n2. **The Curse of Dimensionality**: As dimensions $n$ increase, volume grows exponentially. In high-dimensional space ($n > 50$), all data points become equidistant from each other, destroying the geometric meaning of "nearest".',
      mathFormulas: [
        {
          title: 'Minkowski Distance (L_p Norm)',
          latex: 'D_p(x, z) = \\left( \\sum_{j=1}^n \\left| x_j - z_j \\right|^p \\right)^{\\frac{1}{p}}',
          explanation:
            'Generalized distance metric: p=1 is Manhattan distance, p=2 is Euclidean distance.',
        },
        {
          title: 'k-NN Weighted Distance Voting',
          latex: '\\hat{y} = \\arg\\max_{c \\in \\mathcal{C}} \\sum_{i \\in \\mathcal{N}_k(x)} \\frac{1}{d(x, x^{(i)})^2} \\cdot \\mathbb{I}\\left(y^{(i)} = c\\right)',
          explanation:
            'Weights each neighbor vote inversely proportional to its distance, giving closer neighbors greater influence.',
        },
      ],
      pythonSnippet: {
        title: 'k-NN Classification Pipeline with Feature Scaling in Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates why scaling is mandatory for k-NN and trains a KNeighborsClassifier pipeline.',
        code: `import numpy as np
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report

# 1. Load data and split
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.3, random_state=42, stratify=iris.target
)

# 2. Build Pipeline: StandardScaler + KNeighborsClassifier
# Always bundle scaling into the pipeline to prevent data leakage!
knn_pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('knn', KNeighborsClassifier(n_neighbors=5, metric='minkowski', p=2))
])

# 3. Fit and Evaluate
knn_pipe.fit(X_train, y_train)
y_pred = knn_pipe.predict(X_test)

print("=== k-Nearest Neighbors Evaluation ===")
print("Test Accuracy:", knn_pipe.score(X_test, y_test))
print("\\nClassification Report:\\n", classification_report(y_test, y_pred, target_names=iris.target_names))`,
      },
      keyTakeaways: [
        'k-NN has zero training time O(1), but expensive inference time O(m*n) because it searches the whole dataset.',
        'Feature scaling (StandardScaler) is strictly mandatory; unscaled features completely ruin distance calculations.',
        'Small k creates high variance (overfitting); large k creates high bias (underfitting).',
        'k-NN suffers severely from the Curse of Dimensionality; reduce dimensions via PCA before using on high-dimensional data.',
      ],
      prosAndCons: {
        pros: [
          'Simple, intuitive, non-parametric: makes zero assumptions about underlying data distribution.',
          'Naturally handles multi-class classification and non-linear boundaries.',
        ],
        cons: [
          'Slow and memory-intensive at inference time on massive production datasets.',
          'Degrades catastrophically in high-dimensional spaces (Curse of Dimensionality).',
        ],
      },
      interviewPrep: [
        {
          question: 'Why is feature scaling essential before applying k-NN?',
          answer:
            'k-NN relies entirely on geometric distance metrics (such as Euclidean distance). If features have vastly different numeric scales (e.g. Income in tens of thousands vs Age in tens), the squared differences of the large-magnitude feature will dominate the distance computation, rendering the smaller-magnitude feature completely irrelevant.',
          trapOrTip:
            'Also mention that KD-Trees or Ball-Trees can accelerate k-NN search from O(m) to O(log m) in low dimensions, but revert to O(m) when dimensions exceed ~20 due to the curse of dimensionality.',
        },
      ],
    },
    {
      id: 'naive_bayes',
      tierId: 'tier4',
      title: 'Naive Bayes Classifiers: Probabilistic Generative Models',
      category: 'Supervised Learning',
      difficulty: 'Intermediate',
      summary:
        'Bayes’ Theorem for classification, the "Naive" conditional independence assumption, GaussianNB, MultinomialNB, and Laplace smoothing.',
      estimatedMinutes: 25,
      tags: ['Naive Bayes', 'GaussianNB', 'MultinomialNB', 'Laplace Smoothing', 'NLP', 'Bayesian'],
      intuition:
        'When you read an email with words like "free", "lottery", "cash", and "prize", you instinctively know it is spam. You do not care about the exact grammar or sentence structure; the mere presence of those suspicious words is overwhelming evidence. Naive Bayes does exactly this: it multiplies the probabilities of individual words together, "naively" assuming words appear independently.',
      technicalExplanation:
        '### 1. Bayes’ Theorem for Classification\n\nGiven a feature vector $x = [x_1, x_2, \\dots, x_n]^T$, we want to find the class $c \\in \\mathcal{C}$ that maximizes posterior probability $P(y = c \\mid x)$:\n$$P(y = c \\mid x) = \\frac{P(x \\mid y = c) P(y = c)}{P(x)}$$\nBecause the marginal probability $P(x)$ is constant across all candidate classes, we only need to maximize the numerator:\n$$\\hat{y} = \\arg\\max_{c \\in \\mathcal{C}} P(x \\mid y = c) P(y = c)$$\n\n---\n\n### 2. The "Naive" Conditional Independence Assumption\n\nComputing the joint likelihood $P(x_1, x_2, \\dots, x_n \\mid y = c)$ requires estimating $2^n$ probabilities in high dimensions — impossible with limited data. Naive Bayes makes the bold simplifying assumption that **all features are conditionally independent given the class label**:\n$$P(x_1, x_2, \\dots, x_n \\mid y = c) = \\prod_{j=1}^n P(x_j \\mid y = c)$$\nThis reduces the parameter space from $O(2^n)$ to $O(n)$!\n\n---\n\n### 3. The Three Primary Naive Bayes Variants\n\n1. **`GaussianNB`**:\n   - Used for **continuous numerical features**.\n   - Assumes feature values within each class follow a Gaussian distribution:\n     $$P(x_j \\mid y = c) = \\frac{1}{\\sqrt{2\\pi \\sigma_{cj}^2}} \\exp\\left( -\\frac{(x_j - \\mu_{cj})^2}{2\\sigma_{cj}^2} \\right)$$\n2. **`MultinomialNB`**:\n   - Used for **discrete frequency counts** (e.g. word counts in document classification, spam filtering).\n3. **`BernoulliNB`**:\n   - Used for **binary/boolean features** (e.g. word presence/absence indicator $x_j \\in \\{0, 1\\}$).\n\n---\n\n### 4. Laplace Smoothing (Additive Smoothing)\n\nIf a word (e.g. `"cryptocurrency"`) never appeared in spam emails in the training data, its empirical probability is zero ($P(\\text{"cryptocurrency"} \\mid \\text{spam}) = 0$). Because all probabilities are multiplied together, that single zero will **collapse the entire product to zero**, completely overriding all other evidence!\n\nTo prevent this, **Laplace Smoothing** adds pseudo-counts:\n$$\\hat{P}(x_j = w \\mid c) = \\frac{N_{cw} + \\alpha}{N_c + \\alpha \\cdot |V|}$$\nwhere $\\alpha = 1$ is the smoothing parameter and $|V|$ is the vocabulary size.',
      mathFormulas: [
        {
          title: 'Naive Bayes Maximum A Posteriori (MAP) Rule',
          latex: '\\hat{y} = \\arg\\max_{c \\in \\mathcal{C}} \\left[ \\ln P(y = c) + \\sum_{j=1}^n \\ln P(x_j \\mid y = c) \\right]',
          explanation:
            'Applies log-space summation to prevent floating-point underflow when multiplying dozens of small probabilities.',
        },
        {
          title: 'Laplace Smoothing (Additive Smoothing)',
          latex: '\\hat{\\theta}_{ci} = \\frac{x_{ci} + \\alpha}{\\sum_{k} x_{ck} + \\alpha \\cdot d}',
          explanation:
            'Adds constant alpha (typically 1) to eliminate zero-probability veto bugs for unseen feature values.',
        },
      ],
      pythonSnippet: {
        title: 'Spam Classification with CountVectorizer & MultinomialNB',
        isRunnableInDataForge: true,
        explanation:
          'Builds an end-to-end spam filtering pipeline using Scikit-Learn CountVectorizer and MultinomialNB with Laplace smoothing.',
        code: `from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

# 1. Mini text dataset (Emails and Labels: 1 = Spam, 0 = Ham)
emails = [
    "Win a free lottery cash prize right now",
    "Meeting scheduled for project status report tomorrow",
    "Congratulations you have won million cash dollars",
    "Please find attached the quarterly financial slides",
    "Claim your free gift card urgently prize inside",
    "Hey are we still meeting for lunch today"
]
labels = [1, 0, 1, 0, 1, 0]

# 2. Pipeline: Bag-of-Words Vectorizer + Multinomial Naive Bayes (alpha=1.0)
spam_filter = make_pipeline(CountVectorizer(), MultinomialNB(alpha=1.0))
spam_filter.fit(emails, labels)

# 3. Test on new unseen incoming emails
test_emails = [
    "Free cash prize click here",
    "Can you send the quarterly project report?",
    "Dinner tonight at 7?"
]
preds = spam_filter.predict(test_emails)
probs = spam_filter.predict_proba(test_emails)

print("=== Naive Bayes Spam Filter Results ===")
for text, pred, prob in zip(test_emails, preds, probs):
    label_str = "SPAM" if pred == 1 else "HAM (Legit)"
    print(f"'{text}' => {label_str} [P(Spam) = {prob[1]:.3f}]")`,
      },
      keyTakeaways: [
        'The "naive" assumption is that all features are conditionally independent given the class label.',
        'Blazing fast training and inference O(m*n): requires only counting feature frequencies.',
        'Laplace smoothing (alpha=1) is mandatory to prevent unseen words from wiping out entire probability products to zero.',
        'Compute calculations in log-probability space (summing log probabilities) to avoid numerical floating-point underflow.',
      ],
      prosAndCons: {
        pros: [
          'Incredible baseline performance on text and NLP classification tasks.',
          'Requires very small amounts of training data to estimate parameters.',
          'Robust to irrelevant noise features.',
        ],
        cons: [
          'The independence assumption is almost always mathematically violated in the real world (e.g. "Hong" and "Kong" strongly co-occur).',
          'Probability estimates are poorly calibrated (tend to be pushed toward 0 and 1).',
        ],
      },
      interviewPrep: [
        {
          question: 'What is the "naive" assumption in Naive Bayes, and what is Laplace smoothing?',
          answer:
            'The naive assumption is that all features x_i and x_j are conditionally independent given the class label y: P(x_1, ..., x_n | y) = prod P(x_i | y). Laplace smoothing resolves the zero-probability problem where an unseen feature in the test set has zero frequency in training data, which would otherwise multiply the entire posterior probability to zero. It adds alpha (typically 1) to the numerator and alpha*|V| to the denominator to ensure non-zero probabilities for all features.',
          trapOrTip:
            'State that despite the independence assumption being violated, Naive Bayes often performs surprisingly well because classification only requires ranking the correct class highest, not exact posterior probability calibration.',
        },
      ],
    },
    {
      id: 'support_vector_machines',
      tierId: 'tier4',
      title: 'Support Vector Machines: SVC & SVR',
      category: 'Supervised Learning',
      difficulty: 'Advanced',
      summary:
        'Formal definition of Support Vector Classification (SVC), Maximal Margin Hyperplanes, slack variables, C regularization, the Kernel Trick (RBF), and Support Vector Regression (SVR).',
      estimatedMinutes: 35,
      tags: ['SVM', 'SVC', 'SVR', 'Kernel Trick', 'Support Vectors', 'Margin', 'RBF'],
      intuition:
        'Imagine two rival armies camping on opposite sides of a battlefield. Many lines could be drawn between them that don’t touch either army. But which line is the safest? The line that stays as far away as possible from both armies! That widest possible safe highway is the Maximal Margin. The few soldiers standing on the very front lines closest to the highway are the "Support Vectors" — they alone determine the boundary.',
      technicalExplanation:
        '### 1. Formal Definition of Support Vector Classification (SVC)\n\nIn **Support Vector Classification (SVC)** (`from sklearn.svm import SVC`), we are given labeled training points $(x^{(i)}, y^{(i)})$ with labels $y^{(i)} \\in \\{-1, +1\\}$.\n\nThe separating hyperplane is defined by the equation:\n$$w^T x + b = 0$$\nAny point on the positive margin boundary satisfies $w^T x + b = +1$, and any point on the negative margin boundary satisfies $w^T x + b = -1$.\n\n---\n\n### 2. Geometric Margin Derivation & Margin Width $\\frac{2}{\\|w\\|}$\n\nLet $x_+$ be a support vector on the positive boundary ($w^T x_+ + b = 1$) and $x_-$ be a support vector on the negative boundary ($w^T x_- + b = -1$). Subtracting the two equations:\n$$w^T (x_+ - x_-) = 2$$\nThe margin width $M$ is the orthogonal projection of vector $(x_+ - x_-)$ onto the unit normal vector $\\frac{w}{\\|w\\|}$:\n$$\\text{Margin Width } M = \\frac{w^T}{\\|w\\|} (x_+ - x_-) = \\frac{2}{\\|w\\|}$$\n**To maximize the margin width $\\frac{2}{\\|w\\|}$, we must minimize its denominator $\\|w\\|$**, which is algebraically formulated as the convex quadratic optimization problem:\n$$\\min_{w, b} \\frac{1}{2} \\|w\\|^2 \\quad \\text{subject to } y^{(i)}(w^T x^{(i)} + b) \\ge 1 \\quad \\forall i$$\n\n---\n\n### 3. Soft Margin SVC & The Slack Variable $\\xi_i$\n\nReal-world data is rarely linearly separable. Corrupted points or noise would make hard-margin constraints impossible to satisfy. We introduce **slack variables $\\xi_i \\ge 0$** to allow violations:\n$$\\min_{w, b, \\xi} \\frac{1}{2} \\|w\\|^2 + C \\sum_{i=1}^m \\xi_i \\quad \\text{subject to } y^{(i)}(w^T x^{(i)} + b) \\ge 1 - \\xi_i$$\n**The Regularization Parameter $C$**:\n- **High $C$ (Strict / Hard Margin)**: Heavy penalty for any slack violation. Forces a narrow margin, low bias, but high variance (vulnerable to overfitting on outliers).\n- **Low $C$ (Permissive / Soft Margin)**: Allows more points inside the margin or misclassified. Produces a wider margin, higher bias, but better generalization on noisy real-world data.\n\n---\n\n### 4. The Kernel Trick: Conquering Non-Linear Data\n\nWhen data is not linearly separable in $n$-dimensional space, we map it into a higher-dimensional feature space $\\phi(x)$ where it becomes linearly separable. The **Kernel Trick** allows us to compute the dot product $\\langle \\phi(u), \\phi(v) \\rangle$ directly in the original space via a kernel function $K(u, v)$ without ever explicitly computing the high-dimensional coordinates!\n\n**Common Kernels**:\n1. **Linear Kernel**: $K(u, v) = u^T v$ (best for high-dimensional text data).\n2. **Radial Basis Function (RBF / Gaussian)**:\n   $$K(u, v) = \\exp\\left( -\\gamma \\|u - v\\|^2 \\right)$$\n   - Maps data into an **infinite-dimensional** Hilbert space!\n   - Hyperparameter $\\gamma$ (gamma): defines influence radius of a single support vector. High $\\gamma$ makes tight bell curves (overfitting); low $\\gamma$ makes broad bell curves (underfitting).\n3. **Polynomial Kernel**: $K(u, v) = (\\gamma u^T v + r)^d$.\n\n---\n\n### 5. Support Vector Regression (SVR)\n\nIn **Support Vector Regression (SVR)** (`from sklearn.svm import SVR`), Vladimir Vapnik introduced the **$\\varepsilon$-insensitive loss function**:\n$$\\mathcal{L}_\\varepsilon(y, \\hat{y}) = \\max(0, |y - \\hat{y}| - \\varepsilon)$$\nInstead of fitting a line that touches all points, SVR builds an **$\\varepsilon$-tube** of radius $\\varepsilon$ around the prediction hyperplane. **Any training point falling inside the tube incurs ZERO penalty!** Only errors that breach the outside of the tube are penalized.',
      mathFormulas: [
        {
          title: 'Soft-Margin SVC Primal Optimization Objective',
          latex: '\\min_{w, b, \\xi} \\frac{1}{2}\\|w\\|^2 + C \\sum_{i=1}^m \\xi_i \\quad \\text{s.t.} \\quad y^{(i)}(w^T x^{(i)} + b) \\ge 1 - \\xi_i, \\quad \\xi_i \\ge 0',
          explanation:
            'Balances margin maximization (1/2 ||w||^2) against classification slack violations scaled by penalty C.',
        },
        {
          title: 'RBF (Gaussian) Kernel Function',
          latex: 'K(x, z) = \\exp\\left( -\\gamma \\|x - z\\|^2 \\right) = \\exp\\left( -\\frac{\\|x - z\\|^2}{2\\sigma^2} \\right)',
          explanation:
            'Maps inputs into infinite-dimensional Hilbert space where complex non-linear boundaries become linearly separable.',
        },
        {
          title: 'SVR Vapnik ε-Insensitive Loss Tube',
          latex: '\\mathcal{L}_\\varepsilon(y, f(x)) = \\begin{cases} 0 & \\text{if } |y - f(x)| \\le \\varepsilon \\\\ |y - f(x)| - \\varepsilon & \\text{otherwise} \\end{cases}',
          explanation:
            'Points lying inside the epsilon tube incur zero loss, creating sparse solutions governed only by boundary points.',
        },
      ],
      pythonSnippet: {
        title: 'Complete SVC & SVR Pipeline with Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates training an SVC classifier with RBF kernel and an SVR regressor with epsilon-insensitive tube.',
        code: `import numpy as np
from sklearn.svm import SVC, SVR
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.metrics import accuracy_score, r2_score

# 1. Support Vector Classification (SVC) on Non-linear concentric data
np.random.seed(42)
X_class = np.random.randn(100, 2)
# Concentric circles: inside radius 1.2 is class 1, outside is class 0
y_class = (np.sum(X_class**2, axis=1) < 1.44).astype(int)

# SVC Pipeline with RBF Kernel
svc_model = make_pipeline(
    StandardScaler(),
    SVC(kernel='rbf', C=1.0, gamma='scale')
)
svc_model.fit(X_class, y_class)
y_pred_class = svc_model.predict(X_class)

print("=== Support Vector Classifier (SVC) ===")
print("SVC Kernel: RBF (Gaussian)")
print("Training Accuracy:", accuracy_score(y_class, y_pred_class))
print("Total Support Vectors:", svc_model.named_steps['svc'].support_vectors_.shape[0])

# 2. Support Vector Regression (SVR)
X_reg = np.sort(5 * np.random.rand(80, 1), axis=0)
y_reg = np.sin(X_reg).ravel() + np.random.randn(80) * 0.1

# SVR Pipeline with epsilon-tube = 0.15
svr_model = make_pipeline(
    StandardScaler(),
    SVR(kernel='rbf', C=10.0, epsilon=0.15)
)
svr_model.fit(X_reg, y_reg)
y_pred_reg = svr_model.predict(X_reg)

print("\\n=== Support Vector Regressor (SVR) ===")
print(f"SVR R2 Score: {r2_score(y_reg, y_pred_reg):.3f}")
print("Support vectors lying on or outside epsilon-tube:", svr_model.named_steps['svr'].support_.shape[0])`,
      },
      keyTakeaways: [
        'SVC maximizes the margin width 2/||w|| between classes, making it the Maximum Margin Classifier.',
        'Only support vectors determine the decision boundary; points far away from the margin have zero influence on weights.',
        'Hyperparameter C balances margin width vs training errors: large C = narrow margin (low bias, high variance); small C = wide margin (high bias, low variance).',
        'SVR builds an epsilon-insensitive tube where predictions within distance epsilon incur zero loss.',
        'Always standardize features before SVM: unscaled features warp distance calculations and RBF kernels.',
      ],
      prosAndCons: {
        pros: [
          'Mathematically rigorous: global optimum guaranteed by convex quadratic programming.',
          'Highly effective in high-dimensional spaces (even when n > m).',
          'Memory efficient because the final decision function depends only on a subset of support vectors.',
        ],
        cons: [
          'Training complexity scales between O(m^2) and O(m^3); computationally prohibitive for massive datasets (m > 100,000).',
          'Sensitive to noisy labels and extreme outliers.',
        ],
      },
      interviewPrep: [
        {
          question: 'What is a support vector in SVM, and why are they important?',
          answer:
            'Support vectors are the training data points that lie directly on the margin boundaries (w^T x + b = ±1) or violate the margin (slack xi_i > 0). They are the critical subset of points that determine the orientation and position of the separating hyperplane. If you remove all non-support vectors from the training set and retrain the SVM, the resulting hyperplane remains 100% identical.',
          trapOrTip:
            'Interviewers love asking what happens to the hyperplane if you add a new data point far away from the boundary. Answer: absolutely nothing! Only points inside or on the margin alter the decision boundary.',
        },
        {
          question: 'What is the role of hyperparameter C in SVC?',
          answer:
            'C is the regularization penalty on slack variables sum(xi_i) in the soft-margin objective. A high C places a severe penalty on classification violations, forcing the margin to be narrow to satisfy training points (harder margin, low bias, risk of overfitting). A low C allows more margin violations, producing a wider margin that tolerates misclassifications in exchange for better generalization (higher bias, lower variance).',
          trapOrTip:
            'Remember that in Scikit-Learn SVC, C is inverse to regularization parameter lambda (like C = 1/lambda in logistic regression).',
        },
      ],
    },
    {
      id: 'decision_trees_ensembles',
      tierId: 'tier4',
      title: 'Decision Trees & Ensemble Methods (Random Forest, XGBoost)',
      category: 'Supervised Learning',
      difficulty: 'Intermediate',
      summary:
        'Decision Tree binary splitting, Gini Impurity vs Entropy, Bagging (Random Forests), Boosting (AdaBoost, Gradient Boosting, XGBoost).',
      estimatedMinutes: 35,
      tags: ['Decision Trees', 'Random Forest', 'XGBoost', 'Ensembles', 'Gini', 'Boosting'],
      intuition:
        'A single decision tree is like asking a series of 20 questions ("Is income > $50k?", "Is credit score > 700?"). However, a single tree is fragile and prone to memorizing quirks. Ensembles solve this with the **Wisdom of the Crowds**: instead of asking one doctor for a diagnosis, you consult 500 doctors (Random Forest) or have a sequence of doctors where each doctor specializes in fixing the specific mistakes of the previous one (Gradient Boosting / XGBoost).',
      technicalExplanation:
        '### 1. Decision Tree Construction & Splitting Criteria\n\nA Decision Tree recursively splits the feature space into axis-aligned hyper-rectangles:\n- **Gini Impurity**: Measures the probability that a randomly chosen element is misclassified:\n  $$\\text{Gini}(S) = 1 - \\sum_{k=1}^K p_k^2$$\n  Gini $= 0$ means pure node (all samples belong to a single class).\n- **Shannon Entropy**: Measures information chaos in the node distribution:\n  $$H(S) = -\\sum_{k=1}^K p_k \\log_2(p_k)$$\n- **Information Gain**: Difference between parent impurity and weighted sum of child impurities:\n  $$\\text{Gain}(S, A) = I(S) - \\sum_{v \\in \\text{Children}} \\frac{|S_v|}{|S|} I(S_v)$$\n\n---\n\n### 2. Bagging (Bootstrap Aggregating) & Random Forests\n\nLeo Breiman introduced **Random Forests** to eliminate the high variance of individual deep trees:\n1. **Bootstrap Sampling**: Train $B$ independent trees on random subsets of size $m$ sampled with replacement.\n2. **Feature Subsampling ($m_{\\text{try}} = \\sqrt{n}$)**: At each split, evaluate only a random subset of $\\sqrt{n}$ features. This **decorrelates the trees**, preventing one dominant feature from dominating all trees.\n3. **Aggregation**: Average predictions for regression; take majority vote for classification.\n\n---\n\n### 3. Boosting & XGBoost (Extreme Gradient Boosting)\n\nUnlike Bagging (which trains trees independently in parallel), **Boosting** trains trees **sequentially**:\n- **Gradient Boosting**: Each new tree $h_t(x)$ is trained to predict the **pseudo-residuals (negative gradients)** of the ensemble’s prior predictions:\n  $$r_i^{(t)} = -\\left[ \\frac{\\partial \\mathcal{L}(y_i, \\hat{y}_i^{(t-1)})}{\\partial \\hat{y}_i^{(t-1)}} \\right]$$\n- **XGBoost Second-Order Taylor Expansion**: Tianqi Chen accelerated boosting by approximating any arbitrary convex loss function using both first-order gradients $g_i$ and second-order Hessians $h_i$:\n  $$\\tilde{\\mathcal{L}}^{(t)} \\approx \\sum_{i=1}^m \\left[ g_i f_t(x_i) + \\frac{1}{2} h_i f_t^2(x_i) \\right] + \\gamma T + \\frac{1}{2} \\lambda \\sum_{j=1}^T w_j^2$$\n  where $T$ is the number of leaves and $w_j$ are leaf output weights.',
      mathFormulas: [
        {
          title: 'Gini Impurity Formula',
          latex: '\\text{Gini}(S) = 1 - \\sum_{k=1}^K p_k^2',
          explanation:
            'Measures classification node disorder; equals 0 when all instances in the node belong to the exact same class.',
        },
        {
          title: 'XGBoost Second-Order Taylor Objective',
          latex: '\\mathcal{L}^{(t)} \\approx \\sum_{i=1}^m \\left[ g_i f_t(x_i) + \\frac{1}{2} h_i f_t^2(x_i) \\right] + \\gamma T + \\frac{1}{2}\\lambda \\sum_{j=1}^T w_j^2',
          explanation:
            'Uses gradients g_i and Hessians h_i to compute exact optimal leaf weights while penalizing tree complexity.',
        },
      ],
      pythonSnippet: {
        title: 'Comparing Decision Tree vs Random Forest in Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates how Random Forest eliminates overfitting and stabilizes test accuracy compared to an unconstrained Decision Tree.',
        code: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# 1. Generate noisy moon-shaped dataset
X, y = make_moons(n_samples=500, noise=0.3, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# 2. Fit single unconstrained Decision Tree (prone to severe overfitting)
tree = DecisionTreeClassifier(random_state=42)
tree.fit(X_train, y_train)

# 3. Fit Random Forest (ensemble of 100 decorrelated trees)
forest = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
forest.fit(X_train, y_train)

print("=== Decision Tree vs Random Forest ===")
print(f"Single Tree Train Acc:  {accuracy_score(y_train, tree.predict(X_train)):.3f}")
print(f"Single Tree Test Acc:   {accuracy_score(y_test, tree.predict(X_test)):.3f} (Overfitting gap!)")
print(f"Random Forest Train Acc:{accuracy_score(y_train, forest.predict(X_train)):.3f}")
print(f"Random Forest Test Acc: {accuracy_score(y_test, forest.predict(X_test)):.3f} (Significantly better generalization!)")`,
      },
      keyTakeaways: [
        'Single unconstrained decision trees have high variance and quickly overfit by memorizing training points.',
        'Bagging (Random Forest) reduces variance by averaging predictions from multiple bootstrap-sampled, decorrelated trees.',
        'Boosting (Gradient Boosting / XGBoost) reduces bias by training trees sequentially to correct prior residual errors.',
        'Tree-based algorithms are invariant to monotonic feature scaling (no StandardScaler required).',
      ],
      prosAndCons: {
        pros: [
          'State-of-the-art performance on tabular datasets, routinely dominating Kaggle competitions.',
          'Naturally handles mixed data types (numerical and categorical) without scaling.',
          'Provides feature importance scores (MDI and Permutation Importance).',
        ],
        cons: [
          'Ensembles of hundreds of trees lose the transparent visual interpretability of a single decision tree.',
          'Greedy tree splitting can get trapped in suboptimal splits that miss linear combinations.',
        ],
      },
      interviewPrep: [
        {
          question: 'What is the difference between Bagging and Boosting?',
          answer:
            'Bagging (e.g. Random Forest) trains multiple independent models in parallel on bootstrap samples of data and combines their predictions via voting or averaging, primarily reducing variance. Boosting (e.g. XGBoost, LightGBM) trains models sequentially, where each successive model is trained to predict the residual errors of the previous ensemble, primarily reducing bias.',
          trapOrTip:
            'Highlight that Bagging decorrelates trees by randomly subsampling features at each split, whereas Boosting optimizes gradients and Hessians of the loss function.',
        },
      ],
    },
  ],
};
