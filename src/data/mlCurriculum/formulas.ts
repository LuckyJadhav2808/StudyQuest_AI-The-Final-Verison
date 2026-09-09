import { MlFormulaItem } from '@/types/ml';

export const ML_FORMULA_SHEET: MlFormulaItem[] = [
  {
    id: 'f_r2_score',
    category: 'Supervised Learning',
    title: 'R² Score (Coefficient of Determination)',
    intuition:
      'Quantifies the proportion of total variance in the dependent target variable y that is explained by the regression model, compared to predicting the simple mean baseline.',
    latex: 'R^2 = 1 - \\frac{SS_{\\text{res}}}{SS_{\\text{tot}}} = 1 - \\frac{\\sum_{i=1}^m (y_i - \\hat{y}_i)^2}{\\sum_{i=1}^m (y_i - \\bar{y})^2}',
    variables: [
      { name: 'SS_{\\text{res}}', meaning: 'Residual Sum of Squares (unexplained error remaining after prediction)' },
      { name: 'SS_{\\text{tot}}', meaning: 'Total Sum of Squares (inherent variance around sample mean y_bar)' },
      { name: 'y_i', meaning: 'True ground-truth observation for sample i' },
      { name: '\\hat{y}_i', meaning: 'Model predicted value for sample i' },
      { name: '\\bar{y}', meaning: 'Sample mean of true targets (1/m sum y_i)' },
    ],
    pythonSnippet: `import numpy as np

def r2_score_custom(y_true, y_pred):
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    ss_res = np.sum((y_true - y_pred) ** 2)
    return 1.0 - (ss_res / ss_tot)

# Negative R^2 demonstration on test data
y_t = np.array([10.0, 20.0, 30.0])
y_bad = np.array([100.0, -50.0, 200.0])
print("R2 Score:", r2_score_custom(y_t, y_bad)) # Heavily negative!`,
  },
  {
    id: 'f_adjusted_r2',
    category: 'Supervised Learning',
    title: 'Adjusted R² Score',
    intuition:
      'Penalizes standard R² for redundant or non-informative predictor variables p, preventing artificial metric inflation when adding noise features.',
    latex: 'R^2_{\\text{adj}} = 1 - \\left[ \\frac{(1 - R^2)(m - 1)}{m - p - 1} \\right]',
    variables: [
      { name: 'R^2', meaning: 'Unadjusted coefficient of determination' },
      { name: 'm', meaning: 'Total number of sample observations' },
      { name: 'p', meaning: 'Total number of explanatory feature predictors' },
    ],
    pythonSnippet: `def adjusted_r2(r2, n_samples, n_features):
    numerator = (1.0 - r2) * (n_samples - 1)
    denominator = n_samples - n_features - 1
    return 1.0 - (numerator / denominator)`,
  },
  {
    id: 'f_mae_rmse',
    category: 'Supervised Learning',
    title: 'Mean Absolute Error (MAE) & Root Mean Squared Error (RMSE)',
    intuition:
      'MAE measures average absolute magnitude of errors robustly; RMSE penalizes large errors quadratically and restores units to match original target y.',
    latex: '\\text{MAE} = \\frac{1}{m}\\sum_{i=1}^m |y_i - \\hat{y}_i|, \\quad \\text{RMSE} = \\sqrt{\\frac{1}{m}\\sum_{i=1}^m (y_i - \\hat{y}_i)^2}',
    variables: [
      { name: 'm', meaning: 'Total number of samples' },
      { name: 'y_i', meaning: 'Ground-truth target observation' },
      { name: '\\hat{y}_i', meaning: 'Predicted target value' },
    ],
    pythonSnippet: `import numpy as np

def mae(y_true, y_pred):
    return np.mean(np.abs(y_true - y_pred))

def rmse(y_true, y_pred):
    return np.sqrt(np.mean((y_true - y_pred) ** 2))`,
  },
  {
    id: 'f_svm_margin_width',
    category: 'Supervised Learning',
    title: 'Support Vector Classifier (SVC) Margin Width & Objective',
    intuition:
      'The geometric separation highway width between classes is 2/||w||. Maximizing margin width is equivalent to minimizing 1/2 ||w||^2 subject to classification margin constraints.',
    latex: '\\text{Margin} = \\frac{2}{\\|w\\|}, \\quad \\min_{w, b, \\xi} \\frac{1}{2}\\|w\\|^2 + C \\sum_{i=1}^m \\xi_i \\quad \\text{s.t.} \\quad y_i(w^T x_i + b) \\ge 1 - \\xi_i',
    variables: [
      { name: 'w', meaning: 'Weight vector normal to separating hyperplane' },
      { name: '\\|w\\|', meaning: 'Euclidean norm of weight vector' },
      { name: '\\xi_i', meaning: 'Slack variable allowing margin violation (xi_i >= 0)' },
      { name: 'C', meaning: 'Regularization penalty balancing margin width against training violations' },
    ],
    pythonSnippet: `from sklearn.svm import SVC
# High C = narrow margin (strict); Low C = wide margin (tolerant of violations)
clf = SVC(kernel='rbf', C=1.0, gamma='scale')`,
  },
  {
    id: 'f_svr_tube_loss',
    category: 'Supervised Learning',
    title: 'Support Vector Regression (SVR) ε-Insensitive Loss',
    intuition:
      'Vapnik epsilon-insensitive loss creates a margin tube around predictions; any point lying inside the tube incurs zero penalty.',
    latex: '\\mathcal{L}_\\varepsilon(y, \\hat{y}) = \\max(0, |y - \\hat{y}| - \\varepsilon)',
    variables: [
      { name: '\\varepsilon', meaning: 'Radius of insensitive error tube around regression line' },
      { name: 'y', meaning: 'True continuous target observation' },
      { name: '\\hat{y}', meaning: 'Predicted value from SVR model' },
    ],
    pythonSnippet: `import numpy as np

def epsilon_insensitive_loss(y_true, y_pred, epsilon=0.1):
    return np.maximum(0, np.abs(y_true - y_pred) - epsilon)`,
  },
  {
    id: 'f_knn_minkowski',
    category: 'Supervised Learning',
    title: 'k-Nearest Neighbors Minkowski Distance Metric',
    intuition:
      'Generalized distance metric family parameterized by p: p=1 is Manhattan distance (grid), p=2 is Euclidean distance (straight line).',
    latex: 'D_p(u, v) = \\left( \\sum_{j=1}^n |u_j - v_j|^p \\right)^{\\frac{1}{p}}',
    variables: [
      { name: 'p', meaning: 'Norm order parameter (1 = Manhattan, 2 = Euclidean)' },
      { name: 'u, v', meaning: 'Feature vectors in n-dimensional space' },
    ],
    pythonSnippet: `import numpy as np

def minkowski_distance(u, v, p=2):
    return np.sum(np.abs(u - v) ** p) ** (1.0 / p)`,
  },
  {
    id: 'f_bayes_naive_rule',
    category: 'Supervised Learning',
    title: 'Bayes Theorem & Naive Bayes Maximum A Posteriori (MAP) Rule',
    intuition:
      'Combines prior class probabilities with the product of independent feature likelihoods, evaluated in log-space to prevent underflow.',
    latex: '\\hat{y} = \\arg\\max_{c \\in \\mathcal{C}} \\left[ \\ln P(y = c) + \\sum_{j=1}^n \\ln P(x_j \\mid y = c) \\right]',
    variables: [
      { name: 'P(y = c)', meaning: 'Prior probability of class c' },
      { name: 'P(x_j | y = c)', meaning: 'Conditional likelihood of feature j given class c' },
      { name: '\\mathcal{C}', meaning: 'Set of all discrete target classes' },
    ],
    pythonSnippet: `from sklearn.naive_bayes import GaussianNB, MultinomialNB
gnb = GaussianNB() # Continuous Gaussian likelihoods
mnb = MultinomialNB(alpha=1.0) # Discrete word frequencies with Laplace smoothing`,
  },
  {
    id: 'f_tukey_iqr',
    category: 'Data Preprocessing',
    title: 'Tukey’s Interquartile Range (IQR) Outlier Fences',
    intuition:
      'Defines robust non-parametric fences based on the 25th (Q1) and 75th (Q3) percentiles; any point beyond 1.5 IQR is flagged as an outlier.',
    latex: '\\text{IQR} = Q_3 - Q_1, \\quad \\text{Lower} = Q_1 - 1.5 \\cdot \\text{IQR}, \\quad \\text{Upper} = Q_3 + 1.5 \\cdot \\text{IQR}',
    variables: [
      { name: 'Q_1', meaning: 'First quartile (25th percentile of sorted data)' },
      { name: 'Q_3', meaning: 'Third quartile (75th percentile of sorted data)' },
      { name: '\\text{IQR}', meaning: 'Interquartile range (span of middle 50% of data)' },
    ],
    pythonSnippet: `import numpy as np

def get_iqr_fences(series):
    q1, q3 = np.percentile(series, [25, 75])
    iqr = q3 - q1
    return q1 - 1.5 * iqr, q3 + 1.5 * iqr`,
  },
  {
    id: 'f_ols',
    category: 'Supervised Learning',
    title: 'Ordinary Least Squares (OLS) Normal Equation',
    intuition:
      'Analytically computes the global optimal weight vector minimizing sum of squared residuals without requiring iterative gradient descent.',
    latex: '\\hat{w} = (X^T X)^{-1} X^T y',
    variables: [
      { name: 'X', meaning: 'Design matrix of feature observations (m x (n+1)) with bias column' },
      { name: 'y', meaning: 'Target observation vector (m x 1)' },
      { name: '\\hat{w}', meaning: 'Optimal parameter weights vector ((n+1) x 1)' },
    ],
    pythonSnippet: `import numpy as np

def normal_equation(X, y):
    X_b = np.c_[np.ones((X.shape[0], 1)), X]
    return np.linalg.pinv(X_b.T @ X_b) @ X_b.T @ y`,
  },
  {
    id: 'f_logistic_sigmoid',
    category: 'Supervised Learning',
    title: 'Logistic Sigmoid & Binary Cross-Entropy Loss',
    intuition:
      'Maps any real-valued linear score z to a calibrated probability between 0 and 1, penalized via negative log-likelihood.',
    latex: '\\sigma(z) = \\frac{1}{1 + e^{-z}}, \\quad \\mathcal{L} = -\\frac{1}{m} \\sum_{i=1}^m \\left[ y_i \\ln(\\hat{p}_i) + (1-y_i) \\ln(1-\\hat{p}_i) \\right]',
    variables: [
      { name: 'z', meaning: 'Linear logit (w^T x + b)' },
      { name: '\\hat{p}_i', meaning: 'Predicted probability sigma(z)' },
      { name: 'y_i', meaning: 'Binary ground-truth class label {0, 1}' },
    ],
    pythonSnippet: `import numpy as np

def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -250, 250)))

def binary_cross_entropy(y_true, y_pred, eps=1e-15):
    y_pred = np.clip(y_pred, eps, 1 - eps)
    return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))`,
  },
  {
    id: 'f_ridge_lasso',
    category: 'Supervised Learning',
    title: 'Ridge (L2) & Lasso (L1) Regularization',
    intuition:
      'Penalizes model complexity to mitigate overfitting. Ridge shrinks weights toward zero continuously; Lasso drives uninformative weights to exactly zero.',
    latex: 'J_{\\text{Ridge}}(w) = \\text{MSE} + \\lambda \\sum_{j=1}^n w_j^2, \\quad J_{\\text{Lasso}}(w) = \\text{MSE} + \\lambda \\sum_{j=1}^n |w_j|',
    variables: [
      { name: '\\lambda', meaning: 'Regularization penalty hyperparameter' },
      { name: 'w_j', meaning: 'Model feature weight for dimension j' },
      { name: '\\text{MSE}', meaning: 'Mean squared error loss' },
    ],
    pythonSnippet: `import numpy as np

def ridge_closed_form(X, y, alpha=1.0):
    n_features = X.shape[1]
    I = np.eye(n_features)
    I[0, 0] = 0  # Do not regularize intercept
    return np.linalg.inv(X.T @ X + alpha * I) @ X.T @ y`,
  },
  {
    id: 'f_gini_entropy',
    category: 'Ensembles & Trees',
    title: 'Gini Impurity & Shannon Entropy',
    intuition:
      'Quantifies purity of a class distribution in a decision tree node. Lower values denote cleaner splits.',
    latex: '\\text{Gini} = 1 - \\sum_{k=1}^K p_k^2, \\quad H(S) = -\\sum_{k=1}^K p_k \\log_2(p_k)',
    variables: [
      { name: 'p_k', meaning: 'Proportion of samples belonging to class k in the node' },
      { name: 'K', meaning: 'Total number of discrete target classes' },
    ],
    pythonSnippet: `import numpy as np

def gini_impurity(y):
    _, counts = np.unique(y, return_counts=True)
    probabilities = counts / counts.sum()
    return 1.0 - np.sum(probabilities ** 2)`,
  },
  {
    id: 'f_xgboost_obj',
    category: 'Ensembles & Trees',
    title: 'XGBoost Second-Order Taylor Objective',
    intuition:
      'Approximates any differentiable loss function using exact first and second derivatives (gradients and Hessians) to build greedy regression trees.',
    latex: '\\tilde{\\mathcal{L}}^{(t)} \\approx \\sum_{i=1}^m \\left[ g_i f_t(x_i) + \\frac{1}{2} h_i f_t^2(x_i) \\right] + \\gamma T + \\frac{1}{2} \\lambda \\sum_{j=1}^T w_j^2',
    variables: [
      { name: 'g_i', meaning: 'First-order gradient of loss w.r.t prediction: dL/dy_hat' },
      { name: 'h_i', meaning: 'Second-order Hessian of loss w.r.t prediction: d^2L/dy_hat^2' },
      { name: 'T', meaning: 'Number of terminal leaves in tree' },
      { name: 'w_j', meaning: 'Output weight of leaf j' },
    ],
    pythonSnippet: `def optimal_leaf_weight(G_j, H_j, reg_lambda=1.0):
    return -G_j / (H_j + reg_lambda)`,
  },
  {
    id: 'f_pca_svd',
    category: 'Unsupervised Learning',
    title: 'Principal Component Analysis (PCA Covariance & SVD)',
    intuition:
      'Projects high-dimensional data onto orthogonal axes that maximize sample variance while minimizing reconstruction error.',
    latex: '\\Sigma = \\frac{1}{m} X_{\\text{centered}}^T X_{\\text{centered}}, \\quad X = U \\Sigma V^T, \\quad Z = X_{\\text{centered}} V_k',
    variables: [
      { name: '\\Sigma', meaning: 'Empirical sample covariance matrix of centered X' },
      { name: 'V_k', meaning: 'Top k eigenvectors (principal component directions)' },
      { name: 'Z', meaning: 'Reduced low-dimensional representation' },
    ],
    pythonSnippet: `import numpy as np

def simple_pca(X, n_components=2):
    X_centered = X - np.mean(X, axis=0)
    cov_matrix = np.cov(X_centered, rowvar=False)
    eigenvalues, eigenvectors = np.linalg.eigh(cov_matrix)
    idx = np.argsort(eigenvalues)[::-1][:n_components]
    return X_centered @ eigenvectors[:, idx]`,
  },
  {
    id: 'f_kmeans_wcss',
    category: 'Unsupervised Learning',
    title: 'K-Means Objective Function (WCSS / Inertia)',
    intuition:
      'Minimizes the within-cluster sum of squared Euclidean distances between each point and its assigned centroid.',
    latex: 'J = \\sum_{k=1}^K \\sum_{x_i \\in S_k} \\|x_i - \\mu_k\\|^2',
    variables: [
      { name: 'S_k', meaning: 'Set of data points assigned to cluster k' },
      { name: '\\mu_k', meaning: 'Centroid coordinates for cluster k' },
      { name: 'K', meaning: 'Total number of clusters' },
    ],
    pythonSnippet: `import numpy as np

def compute_wcss(X, centroids, labels):
    wcss = 0.0
    for k in range(len(centroids)):
        cluster_points = X[labels == k]
        if len(cluster_points) > 0:
            wcss += np.sum((cluster_points - centroids[k]) ** 2)
    return wcss`,
  },
  {
    id: 'f_softmax',
    category: 'Deep Learning',
    title: 'Softmax Activation Function',
    intuition:
      'Normalizes an unconstrained vector of real-valued logits into a valid probability distribution that sums strictly to 1.0.',
    latex: '\\text{Softmax}(z)_i = \\frac{e^{z_i}}{\\sum_{c=1}^C e^{z_c}}',
    variables: [
      { name: 'z_i', meaning: 'Logit output score for class i' },
      { name: 'C', meaning: 'Total number of discrete classes' },
    ],
    pythonSnippet: `import numpy as np

def softmax(z):
    # Subtract max for numerical stability (prevents overflow)
    exp_z = np.exp(z - np.max(z, axis=-1, keepdims=True))
    return exp_z / np.sum(exp_z, axis=-1, keepdims=True)`,
  },
  {
    id: 'f_backprop_chain',
    category: 'Deep Learning',
    title: 'Backpropagation Matrix Chain Rule',
    intuition:
      'Propagates loss error signals backward through neural layers by recursively computing partial derivatives via matrix multiplications.',
    latex: '\\frac{\\partial \\mathcal{L}}{\\partial W^{[l]}} = \\frac{1}{m} \\delta^{[l]} (A^{[l-1]})^T, \\quad \\delta^{[l]} = \\left( (W^{[l+1]})^T \\delta^{[l+1]} \\right) \\odot g\'(Z^{[l]})',
    variables: [
      { name: '\\delta^{[l]}', meaning: 'Error vector at layer l (dL/dZ^[l])' },
      { name: 'A^{[l-1]}', meaning: 'Activations from preceding layer' },
      { name: 'g\'', meaning: 'Derivative of layer activation function' },
      { name: '\\odot', meaning: 'Element-wise Hadamard product' },
    ],
    pythonSnippet: `import numpy as np

def backward_step(dZ_next, W_next, A_prev, Z_curr, activation_deriv):
    m = dZ_next.shape[1]
    dZ_curr = (W_next.T @ dZ_next) * activation_deriv(Z_curr)
    dW_curr = (1.0 / m) * (dZ_curr @ A_prev.T)
    db_curr = (1.0 / m) * np.sum(dZ_curr, axis=1, keepdims=True)
    return dW_curr, db_curr, dZ_curr`,
  },
  {
    id: 'f_adam_optimizer',
    category: 'Deep Learning',
    title: 'Adam Optimizer (Adaptive Moment Estimation)',
    intuition:
      'Combines exponential moving average of gradients (Momentum) and squared gradients (RMSprop) with bias corrections for adaptive per-parameter learning rates.',
    latex: '\\theta_{t+1} = \\theta_t - \\frac{\\alpha}{\\sqrt{\\hat{v}_t} + \\epsilon} \\hat{m}_t, \\quad \\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}, \\quad \\hat{v}_t = \\frac{v_t}{1 - \\beta_2^t}',
    variables: [
      { name: 'm_t, v_t', meaning: 'Biased first and second raw moment estimates' },
      { name: '\\hat{m}_t, \\hat{v}_t', meaning: 'Bias-corrected moment estimates' },
      { name: '\\beta_1, \\beta_2', meaning: 'Momentum decay factors (defaults: 0.9, 0.999)' },
      { name: '\\alpha', meaning: 'Base learning rate (default: 0.001)' },
    ],
    pythonSnippet: `# Standard Adam defaults
lr = 0.001
beta1 = 0.9
beta2 = 0.999
eps = 1e-8`,
  },
  {
    id: 'f_roc_auc_trapezoid',
    category: 'Evaluation Metrics',
    title: 'Area Under the ROC Curve (ROC-AUC)',
    intuition:
      'Probability that a classifier will rank a randomly chosen positive instance higher than a randomly chosen negative instance across all thresholds.',
    latex: '\\text{AUC} = \\int_{0}^1 \\text{TPR}(t) \\, d(\\text{FPR}(t)) \\approx \\sum_{k=1}^m \\frac{\\text{TPR}_k + \\text{TPR}_{k-1}}{2} (\\text{FPR}_k - \\text{FPR}_{k-1})',
    variables: [
      { name: '\\text{TPR}', meaning: 'True Positive Rate (Sensitivity / Recall)' },
      { name: '\\text{FPR}', meaning: 'False Positive Rate (1 - Specificity)' },
    ],
    pythonSnippet: `from sklearn.metrics import roc_auc_score

auc = roc_auc_score([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8])
print(f"ROC-AUC: {auc:.3f}")`,
  },
];
