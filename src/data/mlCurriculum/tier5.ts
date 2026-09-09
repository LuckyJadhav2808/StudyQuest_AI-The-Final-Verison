import { MlTier } from '@/types/ml';

export const tier5Data: MlTier = {
  id: 'tier5',
  tierNumber: 5,
  title: 'Model Validation, Diagnostics & Hyperparameter Tuning',
  subtitle: 'Cross-Validation, Leakage Prevention, Bias-Variance Tradeoff & Search Strategies',
  badge: 'Diagnostics & Tuning',
  difficulty: 'Intermediate',
  accentColor: '#ec4899', // Pink
  description:
    'Bridge the gap between amateur model fitting and professional machine learning engineering. Master strict data partitioning protocols, prevent silent catastrophic data leakage, mathematically diagnose underfitting versus overfitting, and systematically optimize hyperparameters using Grid, Random, and Bayesian search.',
  concepts: [
    {
      id: 'data_splits_cross_val',
      tierId: 'tier5',
      title: 'Data Splitting, Cross-Validation & Data Leakage Prevention',
      category: 'Evaluation & Tuning',
      difficulty: 'Intermediate',
      summary:
        'Train/Validation/Test set roles, k-Fold and Stratified k-Fold Cross-Validation, and data leakage elimination using Scikit-Learn Pipelines.',
      estimatedMinutes: 25,
      tags: ['Cross-Validation', 'Data Leakage', 'Train Test Split', 'Pipelines', 'Stratified K-Fold'],
      intuition:
        'Imagine a student who secretly sneaks a copy of tomorrow’s exam into their backpack the night before. On test day, they get a 100%. Are they a genius? No, they cheated! Data leakage is that exact cheating bug in machine learning: information from the future evaluation test set sneaks into the training process, producing phenomenal scores on your laptop that crash disastrously the second the model is deployed to real production users.',
      technicalExplanation:
        '### 1. The 3-Way Data Split\n\nTo rigorously evaluate a machine learning model, raw data must be partitioned into 3 independent sets:\n1. **Training Set ($60-80\\%$)**: Used by optimization algorithms to estimate parameter weights ($w, b$).\n2. **Validation / Development Set ($10-20\\%$)**: Used by the engineer to tune hyperparameters ($k, C, \\gamma, \\text{depth}$) and select candidate models.\n3. **Test Set ($10-20\\%$)**: Locked in a vault. Evaluated exactly ONCE at the end of the project to provide an unbiased estimate of real-world generalization error.\n\n---\n\n### 2. $k$-Fold & Stratified $k$-Fold Cross-Validation\n\nWhen datasets are moderate in size, a single train-test split suffers from high variance (performance varies depending on which samples fell into the test split).\n- **$k$-Fold Cross-Validation**: Data is partitioned into $k$ equal folds. In each iteration, 1 fold is held out for validation while the remaining $k-1$ folds are used for training. Performance is the average over all $k$ rounds:\n  $$\\text{CV}_k = \\frac{1}{k} \\sum_{i=1}^k \\text{Score}_i$$\n- **Stratified $k$-Fold**: Mandatory for classification. Ensures that **each fold preserves the exact percentage ratio of class labels** as the original full dataset, preventing folds from having zero positive instances.\n\n---\n\n### 3. Data Leakage: The #1 Production Killer\n\n**Definition**: When information outside the training dataset is inadvertently used to create the model.\n- **The Classic Preprocessing Leak**: Calling `scaler.fit_transform(X)` on the **entire dataset** before running `train_test_split()`. The scaler computes the mean $\\mu$ and standard deviation $\\sigma$ containing information about the test set, creating unrealistically high test scores.\n- **The Solution**: Encapsulate all transformations inside a Scikit-Learn **`Pipeline`** so that transformers are fitted exclusively on training folds during cross-validation.',
      mathFormulas: [
        {
          title: 'k-Fold Cross-Validation Estimator',
          latex: '\\text{CV}_{(k)} = \\frac{1}{k} \\sum_{i=1}^k \\mathcal{M}\\left( y_{F_i}, \\hat{f}_{\\mathcal{D} \\setminus F_i}(X_{F_i}) \\right)',
          explanation:
            'Averages evaluation metric M across all k iterations where each fold F_i serves as test set once.',
        },
      ],
      pythonSnippet: {
        title: 'Preventing Data Leakage with StratifiedKFold & Pipeline',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates how Scikit-Learn Pipeline guarantees transformations are fitted solely on training folds during StratifiedKFold cross-validation.',
        code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# 1. Create imbalanced synthetic dataset
X, y = make_classification(n_samples=200, n_features=10, weights=[0.85, 0.15], random_state=42)

# 2. Build Pipeline (Transformer + Classifier)
# Leakage Prevention: Scaler will only be fit on training folds during CV!
pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', LogisticRegression(C=1.0))
])

# 3. Stratified 5-Fold Cross-Validation
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(pipe, X, y, cv=cv, scoring='roc_auc')

print("=== Stratified 5-Fold Cross-Validation ===")
print("Individual Fold ROC-AUC Scores:", np.round(scores, 3))
print(f"Mean ROC-AUC: {np.mean(scores):.3f} +/- {np.std(scores):.3f}")
print("Status: Zero Data Leakage guaranteed by Pipeline architecture.")`,
      },
      keyTakeaways: [
        'Never fit any scaler, imputer, or encoder on the entire dataset before splitting.',
        'Always wrap preprocessors and estimators in a Scikit-Learn Pipeline.',
        'Use StratifiedKFold for classification to maintain class proportions across every fold.',
        'The test set must be used only once; using the test set to choose hyperparameters causes test leakage.',
      ],
      prosAndCons: {
        pros: [
          'Cross-validation provides an honest estimate of generalization performance with confidence intervals.',
          'Eliminates dependency on lucky or unlucky single train/test splits.',
        ],
        cons: [
          'k-Fold CV multiplies training compute by k times (e.g. 5x or 10x slower).',
        ],
      },
      interviewPrep: [
        {
          question: 'What is data leakage, give a concrete example, and explain how to prevent it?',
          answer:
            'Data leakage occurs when information from outside the training dataset is inadvertently used to train the model, resulting in overly optimistic evaluation scores that fail in production. A classic example is computing mean and standard deviation for StandardScaler across the entire dataset before doing train/test split. The model learns with knowledge of the test set distribution. It is prevented by wrapping preprocessing and modeling inside a Scikit-Learn Pipeline and fitting transformers strictly on training splits.',
          trapOrTip:
            'Mention temporal data leakage in time-series (using future data to predict the past) and target leakage (including a feature that directly incorporates the label).',
        },
      ],
    },
    {
      id: 'bias_variance_tradeoff',
      tierId: 'tier5',
      title: 'The Bias-Variance Trade-off & Learning Curves',
      category: 'Evaluation & Tuning',
      difficulty: 'Intermediate',
      summary:
        'Mathematical decomposition of expected prediction error into Bias squared, Variance, and Irreducible Noise; diagnosing models with learning curves.',
      estimatedMinutes: 30,
      tags: ['Bias-Variance', 'Learning Curves', 'Underfitting', 'Overfitting', 'Generalization'],
      intuition:
        'Imagine throwing darts at a dartboard. High Bias is like having your sight miscalibrated: all your darts land tightly clustered, but way off in the corner (systematic error). High Variance is like having a shaky, unsteady hand: your darts scatter wildly all over the wall (unstable sensitivity). Good machine learning is having steady hands and a calibrated sight: low bias and low variance.',
      technicalExplanation:
        '### 1. Mathematical Decomposition of Expected Error\n\nFor a target $y = f(x) + \\epsilon$ where $\\epsilon \\sim \\mathcal{N}(0, \\sigma^2)$ is irreducible noise, the expected squared prediction error of a model $\\hat{f}(x)$ decomposes into **three orthogonal components**:\n$$\\mathbb{E}\\left[ (y - \\hat{f}(x))^2 \\right] = \\text{Bias}\\left[\\hat{f}(x)\\right]^2 + \\text{Var}\\left[\\hat{f}(x)\\right] + \\sigma^2$$\nwhere:\n- **$\\text{Bias}\\left[\\hat{f}(x)\\right] = \\mathbb{E}[\\hat{f}(x)] - f(x)$**:\n  Error from erroneous assumptions in the learning algorithm. High bias causes **Underfitting** (model fails to capture true trends).\n- **$\\text{Var}\\left[\\hat{f}(x)\\right] = \\mathbb{E}\\left[ (\\hat{f}(x) - \\mathbb{E}[\\hat{f}(x)])^2 \\right]$**:\n  Sensitivity to small fluctuations in the training set. High variance causes **Overfitting** (model memorizes random noise instead of general patterns).\n- **$\\sigma^2$ (Irreducible Error)**:\n  Inherent noise in the problem domain that no model, no matter how powerful, can ever eliminate.\n\n---\n\n### 2. Diagnosing with Learning Curves\n\nPlotting **Training Score** and **Cross-Validation Score** against the number of training samples $m$ reveals the model’s true illness:\n- **High Bias (Underfitting)**:\n  - Training score is LOW.\n  - Validation score is LOW.\n  - Both curves plateau close together with almost no gap.\n  - **Remedy**: Increase model complexity (higher polynomial degree, deeper trees, add features, decrease regularization $\\lambda$). **Collecting more training data will NOT help!**\n- **High Variance (Overfitting)**:\n  - Training score is HIGH (near 100%).\n  - Validation score is LOW.\n  - There is a **large gap** between training and validation curves.\n  - **Remedy**: **Collect more training data**, increase regularization ($\\|w\\|_1, \\|w\\|_2$), reduce features, decrease tree depth.',
      mathFormulas: [
        {
          title: 'Bias-Variance-Noise Decomposition',
          latex: '\\mathbb{E}\\left[ (y - \\hat{f}(x))^2 \\right] = \\left( \\mathbb{E}[\\hat{f}(x)] - f(x) \\right)^2 + \\mathbb{E}\\left[ (\\hat{f}(x) - \\mathbb{E}[\\hat{f}(x)])^2 \\right] + \\sigma^2',
          explanation:
            'Proves that total expected generalization error is the exact mathematical sum of Bias squared, Variance, and Irreducible Noise.',
        },
      ],
      pythonSnippet: {
        title: 'Generating Learning Curves with Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'Uses learning_curve to compute and diagnose training vs validation performance across training set sizes.',
        code: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import learning_curve

# 1. Generate dataset
X, y = make_classification(n_samples=300, n_features=15, random_state=42)

# 2. Compute Learning Curve
train_sizes, train_scores, val_scores = learning_curve(
    LogisticRegression(max_iter=1000), X, y,
    train_sizes=np.linspace(0.2, 1.0, 5),
    cv=5, scoring='accuracy'
)

# 3. Calculate means
train_mean = np.mean(train_scores, axis=1)
val_mean = np.mean(val_scores, axis=1)

print("=== Learning Curve Diagnostic Report ===")
print("Training Samples | Train Accuracy | Validation Accuracy | Gap")
print("-" * 60)
for size, t_acc, v_acc in zip(train_sizes, train_mean, val_mean):
    print(f"{size:16d} | {t_acc*100:13.1f}% | {v_acc*100:18.1f}% | {(t_acc - v_acc)*100:4.1f}%")

print("\\nDiagnosis: Gap narrows as training size grows, confirming healthy generalization.")`,
      },
      keyTakeaways: [
        'Total expected prediction error is Bias^2 + Variance + Irreducible Noise.',
        'High Bias (Underfitting) cannot be solved by collecting more data; you must increase model capacity or features.',
        'High Variance (Overfitting) can be solved by getting more training data or increasing regularization.',
        'The optimal model complexity lies at the trough of the total error curve.',
      ],
      prosAndCons: {
        pros: [
          'Gives exact scientific guidance on whether to invest time collecting data vs tuning architecture.',
        ],
        cons: [
          'Computing learning curves across multiple training folds can be computationally heavy.',
        ],
      },
      interviewPrep: [
        {
          question: 'If your model has high bias, will collecting more training data improve performance?',
          answer:
            'No. A high-bias model is too simple to capture the underlying true relationship (e.g. fitting a straight line to a quadratic curve). As you add more training data, the model continues to underfit, and the training and validation curves will plateau at a low accuracy score. To fix high bias, you must increase model capacity, engineer polynomial/interaction features, or reduce regularization.',
          trapOrTip:
            'Emphasize that collecting more data is the cure for High Variance, NOT High Bias.',
        },
      ],
    },
    {
      id: 'hyperparameter_tuning',
      tierId: 'tier5',
      title: 'Systematic Hyperparameter Tuning: Grid, Random & Bayesian Search',
      category: 'Evaluation & Tuning',
      difficulty: 'Intermediate',
      summary:
        'Hyperparameters vs learned model weights, GridSearchCV, RandomizedSearchCV, and Bayesian Optimization principles (Optuna).',
      estimatedMinutes: 25,
      tags: ['Hyperparameters', 'GridSearchCV', 'RandomizedSearchCV', 'Optuna', 'Bayesian Optimization'],
      intuition:
        'Model weights (w and b) are like the notes played by musicians during a concert — they are learned through practice. Hyperparameters (like learning rate, tree depth, and C) are like the tuning of the instruments and the temperature of the concert hall — they are set beforehand by the conductor. Hyperparameter tuning is the systematic search for the perfect configuration.',
      technicalExplanation:
        '### 1. Parameters vs Hyperparameters\n\n- **Model Parameters**: Estimated directly from training data via optimization (e.g. weights $w$, bias $b$ in linear models; split thresholds in trees).\n- **Hyperparameters**: Structural settings configured before training begins (e.g. regularization $\\lambda$, learning rate $\\alpha$, $k$ in k-NN, $C$ and $\\gamma$ in SVM, `max_depth` in Random Forest).\n\n---\n\n### 2. Search Strategies\n\n1. **Grid Search (`GridSearchCV`)**:\n   - Exhaustively evaluates the Cartesian product of all provided parameter candidates.\n   - If you test 4 parameters with 5 values each using 5-fold CV, it trains $5^4 \\times 5 = 3,125$ models!\n   - Suffers from the combinatorial explosion.\n2. **Randomized Search (`RandomizedSearchCV`)**:\n   - Coined by James Bergstra & Yoshua Bengio (2012).\n   - Samples $n$ random parameter combinations from continuous or discrete distributions.\n   - **Why it wins**: In practice, only a few hyperparameters truly matter for a given dataset. Grid search wastes time testing unimportant parameters on identical values; Random Search explores far more distinct values of the important parameter in the same budget.\n3. **Bayesian Optimization (Optuna / TPE)**:\n   - Builds a probabilistic surrogate model (e.g. Gaussian Process or Tree-structured Parzen Estimator) of the objective function $f(\\theta) = \\text{Validation Score}$.\n   - Selects the next hyperparameters to test by maximizing **Expected Improvement (EI)**, balancing exploration of uncertain regions with exploitation of known high-performing areas.',
      mathFormulas: [
        {
          title: 'Bayesian Expected Improvement (EI)',
          latex: '\\text{EI}(\\theta) = \\mathbb{E}\\left[ \\max(0, f(\\theta) - f^*) \\right]',
          explanation:
            'Quantifies expected gain over current best score f* when evaluating candidate hyperparameter configuration theta.',
        },
      ],
      pythonSnippet: {
        title: 'RandomizedSearchCV vs GridSearchCV in Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates optimizing RandomForestClassifier hyperparameters using RandomizedSearchCV with cross-validation.',
        code: `import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import randint

# 1. Load classification data
data = load_breast_cancer()
X, y = data.data, data.target

# 2. Define hyperparameter search distributions
param_dist = {
    'n_estimators': randint(50, 200),
    'max_depth': randint(3, 10),
    'min_samples_split': randint(2, 11),
    'min_samples_leaf': randint(1, 6)
}

# 3. Instantiate RandomizedSearchCV (evaluates 15 random combos with 3-fold CV)
random_search = RandomizedSearchCV(
    estimator=RandomForestClassifier(random_state=42),
    param_distributions=param_dist,
    n_iter=15,
    cv=3,
    scoring='roc_auc',
    random_state=42,
    n_jobs=1
)
random_search.fit(X, y)

print("=== Randomized Hyperparameter Search Results ===")
print("Best ROC-AUC Score:", round(random_search.best_score_, 4))
print("Optimal Hyperparameters:")
for param, val in random_search.best_params_.items():
    print(f"  - {param}: {val}")`,
      },
      keyTakeaways: [
        'Model parameters are learned from data; hyperparameters are configured before training.',
        'RandomizedSearchCV is exponentially more efficient than GridSearchCV in high-dimensional spaces.',
        'Bayesian Optimization (Optuna) intelligently uses past trial results to pick better hyperparameter candidates.',
        'Always wrap hyperparameter search around cross-validation pipelines to avoid validation leakage.',
      ],
      prosAndCons: {
        pros: [
          'Finds optimal model configurations that significantly boost test metric performance.',
          'Automated search frees engineers from manual guess-and-check loops.',
        ],
        cons: [
          'High computational cost: tuning complex neural networks can take days or weeks of GPU compute.',
        ],
      },
      interviewPrep: [
        {
          question: 'Why is Randomized Search generally superior to Grid Search for hyperparameter tuning?',
          answer:
            'In real-world ML problems, only a small subset of hyperparameters have a significant impact on model performance. If 9 parameters are tested in a grid with 3 values each, Grid search tests only 3 distinct values for the one parameter that actually matters. In contrast, Randomized Search with the same budget of trials tests dozens of unique values for that important parameter, exploring the response surface far more effectively.',
          trapOrTip:
            'Cite the Bergstra and Bengio (2012) paper "Random Search for Hyper-Parameter Optimization" to show deep foundational knowledge.',
        },
      ],
    },
  ],
};
