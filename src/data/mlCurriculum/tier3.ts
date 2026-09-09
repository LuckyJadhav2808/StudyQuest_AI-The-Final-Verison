import { MlTier } from '@/types/ml';

export const tier3Data: MlTier = {
  id: 'tier3',
  tierNumber: 3,
  title: 'Supervised Learning — Regression',
  subtitle: 'Supervised Foundations, OLS, The R² Score & L1/L2 Regularization',
  badge: 'Supervised Learning',
  difficulty: 'Beginner',
  accentColor: '#34d399', // Emerald
  description:
    'Master the core paradigm of Supervised Learning for continuous targets. Learn Ordinary Least Squares from both geometric and analytical perspectives, solve the Normal Equation, deconstruct the R² Score and regression metrics, and prevent overfitting using Ridge, Lasso, and ElasticNet.',
  concepts: [
    {
      id: 'supervised_learning_intro',
      tierId: 'tier3',
      title: 'Introduction to Supervised Learning & The Regression Problem',
      category: 'Supervised Learning',
      difficulty: 'Beginner',
      summary:
        'Formal definition of Supervised Learning, mapping functions f: X -> Y, continuous target formulation, and the standard Scikit-Learn API paradigm.',
      estimatedMinutes: 20,
      tags: ['Supervised Learning', 'Regression', 'Hypothesis', 'Scikit-Learn', 'Inductive Learning'],
      intuition:
        'Imagine studying for an exam with a complete answer key: for every practice problem, you have both the question and the verified correct answer. You review hundreds of questions until your brain learns the underlying pattern. Supervised learning gives an algorithm that exact experience: a training set of input questions paired with known correct answers, so it can answer new questions it has never seen before.',
      technicalExplanation:
        '### 1. Formal Mathematical Formulation of Supervised Learning\n\nIn Supervised Learning, we are given a training dataset $\\mathcal{D}$ consisting of $m$ input-output pairs:\n$$\\mathcal{D} = \\left\\{ \\left(x^{(1)}, y^{(1)}\\right), \\left(x^{(2)}, y^{(2)}\\right), \\dots, \\left(x^{(m)}, y^{(m)}\\right) \\right\\}$$\nwhere:\n- $x^{(i)} \\in \\mathcal{X} \\subseteq \\mathbb{R}^n$ denotes the $n$-dimensional feature vector for instance $i$.\n- $y^{(i)} \\in \\mathcal{Y}$ denotes the ground-truth target label for instance $i$.\n\n**The Goal**:\nFind a hypothesis mapping function $f: \\mathcal{X} \\to \\mathcal{Y}$ selected from a hypothesis space $\\mathcal{H}$ such that for any unseen input $x^* \\sim \\mathcal{P}_{\\mathcal{X}}$, the predicted output $\\hat{y} = f(x^*)$ minimizes expected risk:\n$$\\mathcal{R}(f) = \\mathbb{E}_{(x, y) \\sim \\mathcal{P}} [\\mathcal{L}(f(x), y)]$$\n\n---\n\n### 2. Regression vs Classification\n\nSupervised learning splits strictly into two problem types based on the target space $\\mathcal{Y}$:\n1. **Regression**:\n   - Target space is **continuous real numbers**: $\\mathcal{Y} \\subseteq \\mathbb{R}$.\n   - Examples: Predicting real estate prices ($\\$540,000$), blood pressure ($120/80$), crop yield (tons per hectare), temperature.\n   - Loss function: Distance-based penalties such as Squared Error $\\frac{1}{2}(y - \\hat{y})^2$ or Absolute Error $|y - \\hat{y}|$.\n2. **Classification**:\n   - Target space is **discrete categories**: $\\mathcal{Y} \\in \\{0, 1\\}$ (binary) or $\\mathcal{Y} \\in \\{1, 2, \\dots, C\\}$ (multi-class).\n   - Examples: Email spam detection, medical diagnosis, handwriting recognition.\n   - Loss function: Probabilistic penalties such as Cross-Entropy (Log-Loss).\n\n---\n\n### 3. The Unified Scikit-Learn API Paradigm\n\nScikit-Learn implements a consistent object-oriented interface across all supervised algorithms:\n1. `model = Estimator(hyperparameters)`: Instantiate the model with configuration.\n2. `model.fit(X_train, y_train)`: Train the model by estimating parameter weights from training data.\n3. `y_pred = model.predict(X_test)`: Generate predictions on new, unseen feature matrices.\n4. `score = model.score(X_test, y_test)`: Compute default evaluation metric ($R^2$ for regressors, Accuracy for classifiers).',
      mathFormulas: [
        {
          title: 'Supervised Risk Minimization Objective',
          latex: 'f^* = \\arg\\min_{f \\in \\mathcal{H}} \\frac{1}{m} \\sum_{i=1}^m \\mathcal{L}\\left(f(x^{(i)}), y^{(i)}\\right)',
          explanation:
            'The optimal supervised model f* minimizes the empirical sum of losses between predicted targets and true training labels.',
        },
      ],
      pythonSnippet: {
        title: 'The Canonical Scikit-Learn Supervised Workflow',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates the 4-step Scikit-Learn lifecycle: Data preparation, train-test splitting, fitting, and inference.',
        code: `import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# 1. Prepare Feature Matrix X and Target Vector y
np.random.seed(42)
X = 5 * np.random.rand(100, 1) # Feature: Engine displacement (Liters)
y = 150 + 45 * X[:, 0] + np.random.randn(100) * 15 # Target: Horsepower

# 2. Train-Test Split (80% train, 20% test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Instantiate and Fit Estimator
regressor = LinearRegression()
regressor.fit(X_train, y_train)

# 4. Predict and Evaluate
y_pred = regressor.predict(X_test)
print("=== Scikit-Learn Supervised Model Evaluated ===")
print(f"Model Slope (w):     {regressor.coef_[0]:.2f}")
print(f"Model Intercept (b): {regressor.intercept_:.2f}")
print(f"Test Set R2 Score:   {r2_score(y_test, y_pred):.3f}")
print(f"Test Set RMSE:       {np.sqrt(mean_squared_error(y_test, y_pred)):.2f} HP")`,
      },
      keyTakeaways: [
        'Supervised learning requires labeled pairs (x, y) containing explicit ground truth.',
        'Regression predicts continuous quantities; Classification predicts discrete categorical buckets.',
        'Never evaluate models on training data: always measure generalization risk on a held-out test set.',
        'All Scikit-Learn estimators implement the universal `.fit()`, `.predict()`, and `.score()` API.',
      ],
      prosAndCons: {
        pros: [
          'High accuracy when abundant, high-quality labeled training data is available.',
          'Direct evaluation metrics with clear business interpretability.',
        ],
        cons: [
          'Labeling data is expensive, time-consuming, and prone to human annotation errors.',
          'Models cannot discover classes or patterns outside the provided training vocabulary.',
        ],
      },
      interviewPrep: [
        {
          question: 'What is the formal difference between regression and classification in supervised learning?',
          answer:
            'In regression, the target label space Y is a continuous metric space (subsets of real numbers R), requiring distance-based loss functions like MSE or MAE. In classification, the target space Y is a discrete, unordered or ordered set of class labels, requiring probabilistic cross-entropy loss functions.',
          trapOrTip:
            'Be careful not to say "continuous data vs discrete data" for the inputs! The inputs X can be continuous or discrete in both regression and classification; the difference lies strictly in the target Y.',
        },
      ],
    },
    {
      id: 'linear_regression',
      tierId: 'tier3',
      title: 'Simple & Multiple Linear Regression & The Normal Equation',
      category: 'Supervised Learning',
      difficulty: 'Beginner',
      summary:
        'Ordinary Least Squares (OLS), derivation of the analytical Normal Equation, and the 5 Gauss-Markov assumptions.',
      estimatedMinutes: 30,
      tags: ['Linear Regression', 'OLS', 'Normal Equation', 'Gauss-Markov', 'Multicollinearity', 'VIF'],
      intuition:
        'Imagine scattering wooden pegs on a table and resting a flat rigid ruler over them. The ruler naturally settles into the angle that minimizes the distance between itself and all the pegs. Linear regression finds that exact optimal hyperplane through mathematical calculation, determining how much each feature contributes to the final prediction.',
      technicalExplanation:
        '### 1. The Multiple Linear Regression Model\n\nFor a sample $x = [x_1, x_2, \\dots, x_n]^T$, the linear model predicts:\n$$\\hat{y} = w_1 x_1 + w_2 x_2 + \\dots + w_n x_n + b = w^T x + b$$\nBy appending an intercept term $x_0 = 1$ to each feature vector, we express this in matrix form:\n$$\\hat{y} = X w$$\nwhere $X \\in \\mathbb{R}^{m \\times (n+1)}$ is the **Design Matrix** and $w \\in \\mathbb{R}^{n+1}$ is the weight vector.\n\n---\n\n### 2. Closed-Form Derivation of the Normal Equation\n\nOrdinary Least Squares (OLS) minimizes the Residual Sum of Squares:\n$$J(w) = \\frac{1}{2} \\|X w - y\\|^2 = \\frac{1}{2} (X w - y)^T (X w - y)$$\nExpanding the transpose and matrix products:\n$$J(w) = \\frac{1}{2} \\left( w^T X^T X w - 2 w^T X^T y + y^T y \\right)$$\nTaking the matrix derivative with respect to parameter vector $w$ and setting to zero:\n$$\\nabla_w J(w) = X^T X w - X^T y = 0$$\n$$X^T X w = X^T y$$\nMultiplying both sides by $(X^T X)^{-1}$ yields the celebrated **Normal Equation**:\n$$\\hat{w} = (X^T X)^{-1} X^T y$$\n\n---\n\n### 3. The 5 Classical Gauss-Markov Assumptions (BLUE)\n\nUnder these assumptions, the OLS estimator is the **Best Linear Unbiased Estimator (BLUE)**:\n1. **Linearity in Parameters**: The true relationship between $X$ and $y$ is linear in weights $w$.\n2. **Strict Exogeneity**: The error terms have zero conditional mean: $\\mathbb{E}[\\epsilon \\mid X] = 0$.\n3. **Homoscedasticity**: The error terms have constant variance across all observations: $\\text{Var}(\\epsilon_i) = \\sigma^2$.\n4. **No Autocorrelation**: Errors of different observations are uncorrelated: $\\text{Cov}(\\epsilon_i, \\epsilon_j) = 0$ for $i \\ne j$.\n5. **No Multicollinearity**: The columns of $X$ are linearly independent; $(X^T X)$ is full rank.',
      mathFormulas: [
        {
          title: 'The Normal Equation (Analytical OLS)',
          latex: '\\hat{w} = \\left( X^T X \\right)^{-1} X^T y',
          explanation:
            'Analytically computes the global optimal weight vector minimizing sum of squared errors in a single closed-form matrix operation.',
        },
        {
          title: 'Variance Inflation Factor (VIF)',
          latex: '\\text{VIF}_j = \\frac{1}{1 - R_j^2}',
          explanation:
            'Quantifies multicollinearity severity for feature j; VIF > 5 or 10 indicates severe redundancy.',
        },
      ],
      pythonSnippet: {
        title: 'Analytical Normal Equation vs Scikit-Learn Comparison',
        isRunnableInDataForge: true,
        explanation:
          'Proves that solving the closed-form Normal Equation mathematically matches Scikit-Learn LinearRegression down to floating-point precision.',
        code: `import numpy as np
from sklearn.linear_model import LinearRegression

# 1. Generate Synthetic Data
np.random.seed(42)
m = 100
X_raw = np.random.rand(m, 2) # 2 features
# True equation: y = 3.5*x1 + 1.8*x2 + 5.0 + noise
y = 3.5 * X_raw[:, 0] + 1.8 * X_raw[:, 1] + 5.0 + np.random.randn(m) * 0.2

# 2. Analytical Normal Equation: w = (X^T X)^-1 X^T y
# Prepend column of 1s for intercept b
X_design = np.c_[np.ones((m, 1)), X_raw]
w_analytical = np.linalg.inv(X_design.T @ X_design) @ X_design.T @ y

# 3. Scikit-Learn Estimator
model = LinearRegression()
model.fit(X_raw, y)

print("=== Analytical Normal Equation vs Scikit-Learn ===")
print("Analytical Weights [Intercept, w1, w2]:", np.round(w_analytical, 4))
print("Scikit-Learn: Intercept =", round(model.intercept_, 4), "Coefficients =", np.round(model.coef_, 4))
print("Exact Match:", np.allclose(w_analytical, [model.intercept_, *model.coef_]))`,
      },
      keyTakeaways: [
        'The Normal Equation solves for the exact global minimum in one step without iterations or learning rates.',
        'Computing (X^T X)^-1 has O(n^3) time complexity; use Gradient Descent when n > 10,000 features.',
        'If features are collinear, (X^T X) is non-invertible; resolve using VIF feature selection or Ridge regression.',
        'OLS is BLUE (Best Linear Unbiased Estimator) when the Gauss-Markov assumptions hold.',
      ],
      prosAndCons: {
        pros: [
          'High interpretability: each coefficient w_j represents the marginal change in y per unit change in x_j.',
          'Fast closed-form training on small-to-medium datasets.',
        ],
        cons: [
          'Fails to capture non-linear relationships without manual polynomial feature engineering.',
          'Highly vulnerable to extreme outliers that skew the squared error penalty.',
        ],
      },
      interviewPrep: [
        {
          question: 'Derive the Normal Equation from the Ordinary Least Squares cost function.',
          answer:
            'Start with cost J(w) = 1/2 ||Xw - y||^2 = 1/2 (w^T X^T X w - 2 w^T X^T y + y^T y). Differentiating with respect to w yields grad_w J = X^T X w - X^T y. Setting grad_w J = 0 gives X^T X w = X^T y. Multiplying both sides by the inverse (X^T X)^-1 yields w = (X^T X)^-1 X^T y.',
          trapOrTip:
            'Mention that this requires (X^T X) to be non-singular and invertible, which requires linearly independent feature columns and m >= n.',
        },
      ],
    },
    {
      id: 'r2_score_metrics',
      tierId: 'tier3',
      title: 'Regression Evaluation Metrics & The R² Score',
      category: 'Supervised Learning',
      difficulty: 'Beginner',
      summary:
        'Formal derivation of the R² Score (Coefficient of Determination), Sum of Squares decomposition, the Mystery of Negative R², Adjusted R², MAE, MSE, and RMSE.',
      estimatedMinutes: 25,
      tags: ['R2 Score', 'Evaluation Metrics', 'RMSE', 'MAE', 'Adjusted R2', 'Regression'],
      intuition:
        'If someone asked you to guess a person’s exam score without knowing anything about them, your smartest baseline guess would be the average score of all students (y_bar). The R² Score measures how much better your machine learning model is compared to that dumb baseline guess. An R² of 0.85 means your model successfully explains 85% of the variation in the data.',
      technicalExplanation:
        '### 1. Sum of Squares Decomposition\n\nLet $y = [y_1, y_2, \\dots, y_m]^T$ be ground-truth targets, $\\hat{y}$ be model predictions, and $\\bar{y} = \\frac{1}{m} \\sum y_i$ be the mean of ground-truth targets:\n- **Total Sum of Squares ($SS_{\\text{tot}}$)**:\n  $$SS_{\\text{tot}} = \\sum_{i=1}^m (y_i - \\bar{y})^2$$\n  Measures the total inherent variance in the dependent variable $y$.\n- **Residual Sum of Squares ($SS_{\\text{res}}$)**:\n  $$SS_{\\text{res}} = \\sum_{i=1}^m (y_i - \\hat{y}_i)^2$$\n  Measures the unexplained error remaining after model prediction.\n- **Explained / Regression Sum of Squares ($SS_{\\text{reg}}$)**:\n  $$SS_{\\text{reg}} = \\sum_{i=1}^m (\\hat{y}_i - \\bar{y})^2$$\n\n---\n\n### 2. Formal Definition of the $R^2$ Score\n\nThe **$R^2$ Score (Coefficient of Determination)** is formally defined as:\n$$R^2 = 1 - \\frac{SS_{\\text{res}}}{SS_{\\text{tot}}} = 1 - \\frac{\\sum_{i=1}^m (y_i - \\hat{y}_i)^2}{\\sum_{i=1}^m (y_i - \\bar{y})^2}$$\n- **$R^2 = 1.0$**: Perfect prediction ($SS_{\\text{res}} = 0$). Every prediction lands exactly on the true point.\n- **$R^2 = 0.0$**: The model performs identically to predicting the horizontal mean $\\bar{y}$ for every sample ($SS_{\\text{res}} = SS_{\\text{tot}}$).\n\n---\n\n### 3. The Mystery of Negative $R^2$ Score ($R^2 < 0$)\n\nA common beginner question is: *"How can a squared metric be negative?"*\n- On the **training set**, an OLS model with an intercept is guaranteed to have $0 \\le R^2 \\le 1$.\n- However, on an **unseen test set**, $R^2$ can be **arbitrarily negative** ($-\\infty < R^2 < 0$).\n- **Why?** If the model is severely overfitted, biased, or tested on out-of-distribution data, its predictions $\\hat{y}$ can be wildly erroneous, making $SS_{\\text{res}} > SS_{\\text{tot}}$. A negative $R^2$ mathematically proves that **predicting the simple sample mean $\\bar{y}$ would have been more accurate than using your machine learning model!**\n\n---\n\n### 4. Adjusted $R^2$: Penalizing Feature Bloat\n\nStandard $R^2$ has a dangerous flaw: adding any new feature into a model (even random Gaussian noise) will **always increase or maintain $R^2$**, never decrease it. To prevent misleading feature inflation, **Adjusted $R^2$** penalizes model complexity:\n$$R^2_{\\text{adj}} = 1 - \\left[ \\frac{(1 - R^2)(m - 1)}{m - p - 1} \\right]$$\nwhere $m$ is the number of samples and $p$ is the number of predictors. If a new feature does not improve the model by more than what chance would predict, $R^2_{\\text{adj}}$ decreases.\n\n---\n\n### 5. Summary of Regression Error Metrics\n\n- **Mean Absolute Error (MAE)**: $\\frac{1}{m}\\sum |y_i - \\hat{y}_i|$. Linear scale, highly robust to outliers.\n- **Mean Squared Error (MSE)**: $\\frac{1}{m}\\sum (y_i - \\hat{y}_i)^2$. Heavily penalizes large errors.\n- **Root Mean Squared Error (RMSE)**: $\\sqrt{\\text{MSE}}$. Same units as target $y$, highly interpretable.',
      mathFormulas: [
        {
          title: 'R² Score (Coefficient of Determination)',
          latex: 'R^2 = 1 - \\frac{SS_{\\text{res}}}{SS_{\\text{tot}}} = 1 - \\frac{\\sum_{i=1}^m (y_i - \\hat{y}_i)^2}{\\sum_{i=1}^m (y_i - \\bar{y})^2}',
          explanation:
            'Proportion of total variance in the target variable explained by the regression model.',
        },
        {
          title: 'Adjusted R² Score',
          latex: 'R^2_{\\text{adj}} = 1 - \\left[ \\frac{(1 - R^2)(m - 1)}{m - p - 1} \\right]',
          explanation:
            'Adjusts R² to account for number of predictors p, strictly penalizing redundant or non-informative features.',
        },
        {
          title: 'Root Mean Squared Error (RMSE)',
          latex: '\\text{RMSE} = \\sqrt{ \\frac{1}{m} \\sum_{i=1}^m \\left( y_i - \\hat{y}_i \\right)^2 }',
          explanation:
            'Square root of mean squared error, returning error metric to original physical units of the target variable.',
        },
      ],
      pythonSnippet: {
        title: 'Computing R², Negative R² Simulation & Regression Metrics',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates computing MAE, MSE, RMSE, R2, and simulating how an overfitted model produces a negative R2 score on test data.',
        code: `import numpy as np
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

# 1. Ground truth and good model predictions
y_true = np.array([3.0, -0.5, 2.0, 7.0, 4.2])
y_good = np.array([2.8, -0.3, 1.9, 6.7, 4.0])

mae = mean_absolute_error(y_true, y_good)
mse = mean_squared_error(y_true, y_good)
rmse = np.sqrt(mse)
r2_good = r2_score(y_true, y_good)

print("=== Standard Regression Evaluation ===")
print(f"MAE:      {mae:.3f}")
print(f"MSE:      {mse:.3f}")
print(f"RMSE:     {rmse:.3f}")
print(f"R2 Score: {r2_good:.3f}")

# 2. Demonstration: Why R2 can be negative!
# Suppose a terrible/overfitted model predicts wildly wrong values on new test data
y_terrible = np.array([50.0, -40.0, 80.0, -20.0, 100.0])
r2_bad = r2_score(y_true, y_terrible)

# Mean baseline calculation
y_mean = np.mean(y_true)
ss_tot = np.sum((y_true - y_mean) ** 2)
ss_res_terrible = np.sum((y_true - y_terrible) ** 2)

print("\\n=== The Mystery of Negative R2 Demonstrated ===")
print(f"SS_tot (variance around mean {y_mean}): {ss_tot:.2f}")
print(f"SS_res (residual errors of terrible model): {ss_res_terrible:.2f}")
print(f"Computed R2: 1 - ({ss_res_terrible:.2f} / {ss_tot:.2f}) = {r2_bad:.2f}")
print("Result: R2 is heavily negative because the model performed worse than predicting the mean!")`,
      },
      keyTakeaways: [
        'R² measures the proportion of variance explained by the model relative to a horizontal mean baseline.',
        'Negative R² is not a bug: it means the model is worse than simply guessing the average target value y_bar.',
        'Standard R² always increases when features are added; always use Adjusted R² when comparing models with different feature counts.',
        'RMSE penalizes large errors more severely than MAE due to the quadratic squaring term.',
      ],
      prosAndCons: {
        pros: [
          'Scale-free metric: R² can be compared across completely different domains (housing vs biology).',
          'Intuitively bounded between 0 and 1 for properly fitted models on training data.',
        ],
        cons: [
          'R² does not indicate whether coefficients or predictions are biased.',
          'High R² does not guarantee good generalization if the model is overfitted.',
        ],
      },
      interviewPrep: [
        {
          question: 'Can R² be negative? Explain why or why not.',
          answer:
            'Yes, R² can be negative when evaluated on an unseen test set or when an intercept is omitted. R² is defined as 1 - (SS_res / SS_tot). If the model makes predictions whose squared errors SS_res are larger than the variance of the data around its mean SS_tot, the ratio exceeds 1, causing 1 - (SS_res / SS_tot) < 0. This mathematically indicates that the model performs worse than a naive baseline that always predicts the training mean.',
          trapOrTip:
            'Many candidates mistakenly state that R² is the square of Pearson correlation r and therefore can never be negative. Clarify that this equality holds only for simple linear regression with an intercept on the training data, not on general test sets.',
        },
      ],
    },
    {
      id: 'regularization_ridge_lasso',
      tierId: 'tier3',
      title: 'Regularization: Ridge (L2), Lasso (L1) & ElasticNet',
      category: 'Supervised Learning',
      difficulty: 'Intermediate',
      summary:
        'Penalizing parameter complexity to combat overfitting. Ridge weight shrinkage, Lasso automated sparse feature selection, and ElasticNet.',
      estimatedMinutes: 25,
      tags: ['Regularization', 'Ridge', 'Lasso', 'ElasticNet', 'L1', 'L2', 'Overfitting'],
      intuition:
        'Imagine a defense lawyer arguing in court. An overfitted lawyer invents convoluted, bizarre theories with extreme numbers just to explain away every minor inconsistency in the evidence. Regularization is like a strict judge who says: "Every time you propose a complicated theory with huge numbers, you pay a heavy fine." The lawyer is forced to stick to simple, realistic explanations that actually generalize to the truth.',
      technicalExplanation:
        '### 1. The Danger of Overfitting & Exploding Weights\n\nWhen a linear model is trained on noisy data or collinear features, parameter weights $w_j$ can explode to extreme positive and negative values that cancel each other out on training points but produce wild swings on unseen data.\n\nRegularization adds a **complexity penalty** to the cost function:\n$$J_{\\text{regularized}}(w) = \\text{Loss}(X, y, w) + \\lambda \\cdot \\Omega(w)$$\nwhere $\\lambda \\ge 0$ is the regularization strength hyperparameter:\n- $\\lambda = 0$: Unconstrained Ordinary Least Squares (high variance, risk of overfitting).\n- $\\lambda \\to \\infty$: Weights shrink to zero (high bias, model predicts a constant line).\n\n---\n\n### 2. Ridge Regression ($L_2$ Regularization)\n\nRidge adds the sum of squared weights:\n$$J_{\\text{Ridge}}(w) = \\frac{1}{2m} \\sum_{i=1}^m (w^T x^{(i)} - y^{(i)})^2 + \\frac{\\lambda}{2} \\sum_{j=1}^n w_j^2$$\n**Closed-Form Solution**:\n$$\\hat{w}_{\\text{Ridge}} = \\left( X^T X + \\lambda I \\right)^{-1} X^T y$$\nBecause $\\lambda I$ is added to the diagonal, $(X^T X + \\lambda I)$ is **strictly positive definite and always invertible**, even when features are perfectly collinear!\n\n---\n\n### 3. Lasso Regression ($L_1$ Regularization) & Sparse Feature Selection\n\nLasso (Least Absolute Shrinkage and Selection Operator) penalizes the sum of absolute weights:\n$$J_{\\text{Lasso}}(w) = \\frac{1}{2m} \\sum_{i=1}^m (w^T x^{(i)} - y^{(i)})^2 + \\lambda \\sum_{j=1}^n |w_j|$$\n**The Diamond Geometry**:\nBecause the $L_1$ ball has sharp corners (vertices) along the coordinate axes, the elliptical contours of the MSE loss intersect the $L_1$ constraint surface directly at axes where weights are **identically zero ($w_j = 0$)**. Lasso performs **automated feature selection**, discarding useless variables.\n\n---\n\n### 4. ElasticNet: The Best of Both Worlds\n\nWhen multiple features are correlated, Lasso arbitrarily picks one and drops the others. ElasticNet combines both penalties:\n$$J_{\\text{ElasticNet}}(w) = \\text{MSE} + r \\lambda \\|w\\|_1 + \\frac{1-r}{2} \\lambda \\|w\\|_2^2$$\nwhere $r \\in [0, 1]$ is the $L_1$ ratio. ElasticNet groups correlated features together while retaining sparse selection.',
      mathFormulas: [
        {
          title: 'Ridge Closed-Form Normal Equation',
          latex: '\\hat{w}_{\\text{Ridge}} = \\left( X^T X + \\lambda I \\right)^{-1} X^T y',
          explanation:
            'Guarantees matrix invertibility by adding regularizer lambda to the diagonal of X^T X, shrinking coefficients continuously.',
        },
        {
          title: 'Lasso Objective (L1 Penalty)',
          latex: 'J_{\\text{Lasso}}(w) = \\frac{1}{2m} \\|X w - y\\|^2 + \\lambda \\|w\\|_1 = \\text{MSE} + \\lambda \\sum_{j=1}^n |w_j|',
          explanation:
            'L1 absolute value penalty creates non-differentiable corners that drive non-informative weights to exact zeros.',
        },
      ],
      pythonSnippet: {
        title: 'Comparing Ridge vs Lasso Weight Sparsity in Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates how Lasso drives uninformative feature weights to exactly 0.0, while Ridge shrinks them smoothly.',
        code: `import numpy as np
from sklearn.linear_model import LinearRegression, Ridge, Lasso

# 1. Dataset with 5 features: only feature 0 and 1 are truly informative
np.random.seed(42)
m = 60
X = np.random.randn(m, 5)
# True weights: [5.0, -3.0, 0.0, 0.0, 0.0]
y = 5.0 * X[:, 0] - 3.0 * X[:, 1] + np.random.randn(m) * 0.5

# 2. Fit OLS, Ridge (L2), and Lasso (L1)
ols = LinearRegression().fit(X, y)
ridge = Ridge(alpha=1.0).fit(X, y)
lasso = Lasso(alpha=0.3).fit(X, y)

print("=== Regularization Weight Comparison ===")
print("True Weights:   [ 5.0,  -3.0,   0.0,   0.0,   0.0]")
print("OLS Weights:   ", np.round(ols.coef_, 2))
print("Ridge (L2):    ", np.round(ridge.coef_, 2), "<- Shrunk smoothly")
print("Lasso (L1):    ", np.round(lasso.coef_, 2), "<- EXACT ZEROS on noise features!")`,
      },
      keyTakeaways: [
        'Regularization combats overfitting by penalizing large model parameter weights.',
        'Ridge (L2) shrinks coefficients close to zero but never exactly zero; handles multicollinearity.',
        'Lasso (L1) creates exact zero weights, functioning as automated sparse feature selection.',
        'Always standardize features before applying Ridge or Lasso: unscaled features receive disproportionate penalties.',
      ],
      prosAndCons: {
        pros: [
          'Prevents catastrophic overfitting on high-dimensional datasets ($n > m$).',
          'Lasso simplifies production deployment by pruning unneeded input features.',
        ],
        cons: [
          'Introduces hyperparameter lambda (or alpha in Scikit-Learn) that requires Cross-Validation tuning.',
          'Under-penalizing leads to overfitting; over-penalizing causes severe underfitting.',
        ],
      },
      interviewPrep: [
        {
          question: 'Why does Lasso (L1) produce sparse weights with exact zeros, while Ridge (L2) does not?',
          answer:
            'The L1 penalty constraint region is an octahedron/diamond with sharp vertices lying directly on the coordinate axes. When the elliptical contours of the MSE loss expand, they almost always touch the sharp corner of the L1 ball first, setting that coordinate weight to exactly zero. In contrast, the L2 constraint is a smooth circle/hypersphere without vertices, causing the loss contours to touch tangential points with non-zero coordinates.',
          trapOrTip:
            'Mention that the subgradient of |w| is a constant (-1 or +1), pulling weights toward zero with constant force, whereas the derivative of w^2 is 2w, which diminishes as w approaches zero.',
        },
      ],
    },
  ],
};
