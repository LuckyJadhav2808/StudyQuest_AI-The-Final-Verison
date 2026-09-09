import { MlQuizQuestion } from '@/types/ml';

export const ML_QUIZ_QUESTIONS: MlQuizQuestion[] = [
  {
    id: 'q_numpy_1',
    tierId: 'tier1',
    category: 'Foundations & Stack',
    question: 'Why does NumPy execute array operations significantly faster than standard Python list comprehensions?',
    options: [
      'NumPy converts all Python code to JavaScript before running',
      'NumPy uses contiguous C memory buffers, SIMD vectorization, and avoids Python dynamic type checks',
      'NumPy automatically sends all array calculations to a remote cloud server',
      'NumPy compresses numbers into 4-bit integers by default',
    ],
    correctIndex: 1,
    explanation:
      'NumPy stores elements in contiguous memory buffers of uniform C types. This enables CPU cache hits, vector SIMD instructions, and eliminates pointer-chasing and runtime type evaluation.',
  },
  {
    id: 'q_pandas_1',
    tierId: 'tier1',
    category: 'Foundations & Stack',
    question: 'What is the critical difference between df.loc and df.iloc in Pandas?',
    options: [
      'df.loc accepts only column indices; df.iloc accepts row indices',
      'df.loc is label-based indexing, whereas df.iloc is integer-position based indexing (0 to N-1)',
      'df.loc is for strings; df.iloc is for numbers',
      'df.loc runs asynchronously; df.iloc runs synchronously',
    ],
    correctIndex: 1,
    explanation:
      '`.loc[row_label, col_label]` references explicit index names/labels. `.iloc[row_idx, col_idx]` references 0-based integer positional coordinates regardless of index names.',
  },
  {
    id: 'q_stats_1',
    tierId: 'tier2',
    category: 'Statistics & Math',
    question: 'According to the Central Limit Theorem (CLT), what happens to the distribution of sample means as sample size n grows?',
    options: [
      'It becomes identical to the original raw population distribution',
      'It collapses into a uniform flat line',
      'It approximates a normal (Gaussian) distribution regardless of population distribution (assuming finite variance)',
      'The sample variance increases linearly with n',
    ],
    correctIndex: 2,
    explanation:
      'The CLT proves that the sum or average of independent random variables converges to a normal distribution N(μ, σ²/n) as n increases, provided the population has finite variance.',
  },
  {
    id: 'q_gradient_1',
    tierId: 'tier2',
    category: 'Statistics & Math',
    question: 'What occurs if the learning rate α is chosen excessively large in Gradient Descent?',
    options: [
      'The model parameters freeze and do not update',
      'The loss function will oscillate wildly and overshoot the minimum, potentially diverging to infinity',
      'The model will immediately achieve zero error on the test dataset',
      'The algorithm automatically switches to Genetic Algorithms',
    ],
    correctIndex: 1,
    explanation:
      'An excessive learning rate causes gradient step sizes to leap over the valley of the minimum and climb the opposite walls, causing loss oscillation or catastrophic divergence.',
  },
  {
    id: 'q_regression_1',
    tierId: 'tier3',
    category: 'Supervised Learning',
    question: 'What is the primary operational difference between Lasso (L1) and Ridge (L2) regularization?',
    options: [
      'Lasso can drive coefficients precisely to zero for feature selection; Ridge shrinks them asymptotically toward zero',
      'Ridge eliminates features completely; Lasso only scales them',
      'Lasso is used for classification; Ridge is used for clustering',
      'Ridge requires zero feature scaling, whereas Lasso fails without it',
    ],
    correctIndex: 0,
    explanation:
      'Due to the diamond geometry of L1 balls, the loss surface hits sharp axis intersections first, driving non-essential feature weights to exactly 0 (sparse selection). Ridge uses a smooth circular L2 norm, shrinking weights without zeroing them.',
  },
  {
    id: 'q_forest_1',
    tierId: 'tier3',
    category: 'Supervised Learning',
    question: 'How do Random Forests achieve lower variance than a single individual Decision Tree?',
    options: [
      'By pruning all trees down to depth 1 (stumps)',
      'By training an ensemble of deep, decorrelated trees using bootstrap aggregation (bagging) and random feature subsets',
      'By training each tree sequentially on the residuals of the previous tree',
      'By converting all continuous features into binary flags',
    ],
    correctIndex: 1,
    explanation:
      'Random Forests average predictions across many deep, low-bias trees. By bagging (bootstrap resampling) and randomly restricting candidate split features at each node, trees become decorrelated, dramatically reducing ensemble variance.',
  },
  {
    id: 'q_metrics_1',
    tierId: 'tier4',
    category: 'Evaluation & Tuning',
    question: 'In a medical diagnostic test for a rare, deadly disease, which metric should typically be prioritized?',
    options: [
      'High Accuracy',
      'High Recall (Sensitivity) to minimize False Negatives',
      'High Specificity to ignore healthy patients',
      'High Mean Squared Error',
    ],
    correctIndex: 1,
    explanation:
      'A False Negative means an infected patient is sent home untreated and may die. Recall = TP / (TP + FN); maximizing Recall minimizes life-threatening False Negatives.',
  },
  {
    id: 'q_leakage_1',
    tierId: 'tier4',
    category: 'Evaluation & Tuning',
    question: 'What is data leakage in machine learning workflows?',
    options: [
      'A security breach where passwords are stolen from the training server',
      'When information from outside the training set (like test data statistics or future timestamps) contaminates model training',
      'When memory runs out in a Pyodide WebAssembly worker',
      'When a neural network loses weights during backpropagation',
    ],
    correctIndex: 1,
    explanation:
      'Data leakage happens when test set information (such as global mean/std scaling or future time-series values) is used during training, resulting in falsely inflated validation scores that fail in production.',
  },
  {
    id: 'q_kmeans_1',
    tierId: 'tier5',
    category: 'Unsupervised Learning',
    question: 'What is a major known limitation of the standard K-Means clustering algorithm?',
    options: [
      'It cannot handle numerical features',
      'It assumes clusters are spherical and isotropic; it struggles with non-convex or varying-density geometries',
      'It is too slow to run on datasets larger than 100 rows',
      'It requires labeled target columns',
    ],
    correctIndex: 1,
    explanation:
      'K-Means partitions space using Voronoi diagrams based on Euclidean distance, implicitly assuming spherical clusters. For concentric rings or elongated crescent shapes, density-based algorithms like DBSCAN or spectral clustering are required.',
  },
  {
    id: 'q_pca_1',
    tierId: 'tier5',
    category: 'Unsupervised Learning',
    question: 'Why must features be standardized (mean=0, variance=1) before applying Principal Component Analysis (PCA)?',
    options: [
      'PCA algorithm will throw a runtime syntax error on unscaled values',
      'PCA identifies directions of maximum variance; unscaled features with large units would falsely dominate the principal axes',
      'Standardization turns all categorical variables into continuous numbers',
      'Standardization guarantees that the explained variance ratio equals 100%',
    ],
    correctIndex: 1,
    explanation:
      'PCA maximizes variance. A feature measured in millimeters (range 0 to 100,000) would have orders of magnitude more variance than a feature measured in meters (0 to 100), drowning it out purely due to arbitrary unit scale.',
  },
  {
    id: 'q_nlp_1',
    tierId: 'tier6',
    category: 'NLP & Time Series',
    question: 'What is the primary advantage of dense word embeddings (e.g. Word2Vec) over TF-IDF?',
    options: [
      'TF-IDF only works on German; Word2Vec works on English',
      'Dense embeddings capture semantic context and similarity in fixed vector dimensions, whereas TF-IDF is sparse and order-blind',
      'Embeddings do not require any training data',
      'TF-IDF consumes more GPU compute than Transformer models',
    ],
    correctIndex: 1,
    explanation:
      'Dense embeddings represent words in continuous low-dimensional vector spaces where geometric distance reflects semantic similarity (e.g. synonyms cluster together), overcoming the curse of dimensionality and synonym blindness of sparse TF-IDF vectors.',
  },
  {
    id: 'q_relu_1',
    tierId: 'tier7',
    category: 'Deep Learning & MLOps',
    question: 'Why did ReLU (Rectified Linear Unit) replace Sigmoid for hidden layers in deep neural networks?',
    options: [
      'ReLU outputs complex imaginary numbers',
      'Sigmoid saturates near 0 and 1, causing the vanishing gradient problem; ReLU has a constant derivative of 1 for positive inputs',
      'ReLU eliminates the need for matrix multiplication',
      'Sigmoid cannot be differentiated using calculus',
    ],
    correctIndex: 1,
    explanation:
      'In deep architectures, multiplying Sigmoid derivatives (which peak at only 0.25) across many layers causes gradients to shrink exponentially to near-zero (vanishing gradient). ReLU maintains a clean gradient of 1.0 for all positive activations.',
  },
  {
    id: 'q_mlops_1',
    tierId: 'tier7',
    category: 'Deep Learning & MLOps',
    question: 'What is the difference between Data Drift and Concept Drift in production ML systems?',
    options: [
      'Data drift is in databases; concept drift is in memory',
      'Data drift is change in input feature distribution P(X); concept drift is change in the underlying relationship P(Y|X)',
      'They are identical terms with no distinction',
      'Data drift happens during training; concept drift only occurs after model deletion',
    ],
    correctIndex: 1,
    explanation:
      'Data Drift (Covariate Shift) occurs when user or input feature distributions change over time. Concept Drift occurs when the true relationship between input features and target labels alters (e.g. purchasing behavior shifts after macroeconomic shock).',
  },
  {
    id: 'q_svm_kernel_1',
    tierId: 'tier3',
    category: 'Supervised Learning',
    question: 'How does the Support Vector Machine (SVM) Kernel Trick achieve non-linear classification without high computational cost?',
    options: [
      'It creates duplicate synthetic records in CSV files',
      'It evaluates dot products in high-dimensional feature space directly using kernel functions without ever explicitly computing coordinate transformations',
      'It converts data points into frequency sound waves',
      'It executes code on quantum computers',
    ],
    correctIndex: 1,
    explanation:
      'By Mercer’s Theorem, kernel functions K(x, x\') compute the inner product in an implicit high-dimensional Hilbert space directly, bypassing the exponential cost of explicitly transforming feature coordinates.',
  },
  {
    id: 'q_bias_var_1',
    tierId: 'tier4',
    category: 'Evaluation & Tuning',
    question: 'When analyzing a learning curve, what does a persistent, large gap between high training score and significantly lower validation score indicate?',
    options: [
      'High Bias (Underfitting)',
      'High Variance (Overfitting)',
      'The model has achieved optimal Bayes error',
      'The dataset has zero noise',
    ],
    correctIndex: 1,
    explanation:
      'A wide gap where training performance is high but validation performance lags indicates the model is memorizing training-specific noise rather than generalizing (High Variance / Overfitting). Regularization or more data is required.',
  },
  {
    id: 'q_lasso_ridge_1',
    tierId: 'tier3',
    category: 'Supervised Learning',
    question: 'Why can Lasso (L1) regularization perform automatic feature selection while Ridge (L2) cannot?',
    options: [
      'Lasso uses an exponential penalty',
      'Lasso penalty has sharp diamond corners at zero axes, causing optimal parameter contours to intersect exactly at zero',
      'Ridge cannot be used with gradient descent',
      'Lasso deletes columns directly from disk',
    ],
    correctIndex: 1,
    explanation:
      'The L1 diamond constraint has sharp vertices on the coordinate axes. The elliptical contours of the sum of squares error are mathematically much more likely to hit a corner on the axis, driving uninformative weights exactly to 0.',
  },
  {
    id: 'q_roc_auc_1',
    tierId: 'tier4',
    category: 'Evaluation & Tuning',
    question: 'What does an ROC-AUC score of 0.5 represent for a binary classification model?',
    options: [
      'A perfect classifier with 50% accuracy',
      'A classifier that performs no better than random guessing',
      'A classifier with 100% precision and 50% recall',
      'An overfitted model',
    ],
    correctIndex: 1,
    explanation:
      'An ROC curve that traces the 45-degree diagonal has an Area Under the Curve (AUC) of 0.5, indicating the model ranks positive and negative instances with performance equivalent to random coin tossing.',
  },
];

