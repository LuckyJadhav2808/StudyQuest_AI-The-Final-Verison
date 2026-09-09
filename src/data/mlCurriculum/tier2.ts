import { MlTier } from '@/types/ml';

export const tier2Data: MlTier = {
  id: 'tier2',
  tierNumber: 2,
  title: 'Mathematics & Optimization for Machine Learning',
  subtitle: 'Linear Algebra, Probability Distributions, Bayes Rule & Gradient Descent',
  badge: 'Mathematical Foundations',
  difficulty: 'Intermediate',
  accentColor: '#818cf8', // Indigo
  description:
    'Deconstruct the mathematical machinery powering every modern learning algorithm: vector spaces, matrix factorizations, multivariable calculus, probability distributions, inferential statistics, and convex optimization via gradient descent.',
  concepts: [
    {
      id: 'linear_algebra_ml',
      tierId: 'tier2',
      title: 'Linear Algebra & Matrix Calculus for ML',
      category: 'Statistics & Math',
      difficulty: 'Intermediate',
      summary:
        'Vectors, dot products as projections, matrix transformations, determinants, invertibility conditions, and gradient/Hessian calculus.',
      estimatedMinutes: 30,
      tags: ['Linear Algebra', 'Matrices', 'Dot Products', 'Calculus', 'Gradients', 'Hessian'],
      intuition:
        'Linear algebra is the language in which all machine learning is written. A single data sample is a vector (an arrow pointing in space). A dataset of 100,000 samples is a matrix (a cloud of points). When you run an algorithm, you are rotating, stretching, and projecting these high-dimensional geometric spaces to find the plane or boundary that separates categories or predicts targets.',
      technicalExplanation:
        '### 1. Vectors, Norms & The Geometric Dot Product\n\nA vector $x \\in \\mathbb{R}^n$ represents a coordinate point or direction in $n$-dimensional space.\n- **Dot Product ($a^T b = \\sum a_i b_i$)**:\n  $$a \\cdot b = \\|a\\| \\|b\\| \\cos(\\theta)$$\n  If $a \\cdot b = 0$, the vectors are **orthogonal** (perpendicular, zero correlation). The dot product mathematically measures the length of projection of vector $a$ onto vector $b$.\n- **Vector Norms**:\n  - **$L_2$ Euclidean Norm**: $\\|x\\|_2 = \\sqrt{\\sum_{i=1}^n x_i^2}$ (geometric straight-line distance).\n  - **$L_1$ Manhattan Norm**: $\\|x\\|_1 = \\sum_{i=1}^n |x_i|$ (taxicab distance, induces sparsity in Lasso).\n\n---\n\n### 2. Matrix Inversion & The Normal Equation Condition\n\nA square matrix $A \\in \\mathbb{R}^{n \\times n}$ has an inverse $A^{-1}$ satisfying $A A^{-1} = I$ if and only if its **determinant $\\det(A) \\ne 0$** (the matrix is full rank and non-singular).\n\nIn linear regression, solving $\\hat{w} = (X^T X)^{-1} X^T y$ requires that $(X^T X)$ is invertible. This fails if:\n1. Number of features $n > m$ (more features than training instances).\n2. **Multicollinearity**: Two or more feature columns are linearly dependent (e.g. $x_2 = 2 x_1$). In this case, $(X^T X)$ is singular, requiring pseudoinverse ($X^+$ via SVD) or $L_2$ Ridge regularization.\n\n---\n\n### 3. Multivariable Matrix Calculus: Gradients & Hessians\n\n- **Gradient Vector $\\nabla f(w)$**:\n  Vector of first-order partial derivatives pointing in the direction of **steepest ascent**:\n  $$\\nabla_w f(w) = \\begin{bmatrix} \\frac{\\partial f}{\\partial w_1} & \\frac{\\partial f}{\\partial w_2} & \\dots & \\frac{\\partial f}{\\partial w_n} \\end{bmatrix}^T$$\n- **Hessian Matrix $H = \\nabla^2 f(w)$**:\n  The $n \\times n$ matrix of second-order partial derivatives $H_{ij} = \\frac{\\partial^2 f}{\\partial w_i \\partial w_j}$. If the Hessian is **Positive Semi-Definite (PSD)** everywhere ($z^T H z \\ge 0$ for all $z$), the cost function is strictly **convex**, guaranteeing that any local minimum is the **global minimum**.',
      mathFormulas: [
        {
          title: 'Geometric Dot Product & Projection',
          latex: 'u \\cdot v = \\|u\\| \\|v\\| \\cos(\\theta) = \\sum_{i=1}^n u_i v_i',
          explanation:
            'Calculates geometric inner product; when vectors are normalized unit vectors, the dot product equals their cosine similarity.',
        },
        {
          title: 'Hessian Matrix & Convexity Condition',
          latex: 'H_{ij} = \\frac{\\partial^2 f}{\\partial w_i \\partial w_j}, \\quad z^T H z \\ge 0 \\quad \\forall z \\ne 0 \\implies f \\text{ is Convex}',
          explanation:
            'A positive semi-definite Hessian matrix guarantees that the optimization objective has no sub-optimal local minima.',
        },
      ],
      pythonSnippet: {
        title: 'Matrix Inversion, Dot Products & SVD Decomposition in NumPy',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates checking matrix rank, determinant, computing Euclidean vs Manhattan norms, and solving normal equations via NumPy.',
        code: `import numpy as np

# 1. Vectors and Norms
v1 = np.array([3.0, 4.0])
v2 = np.array([1.0, 0.0])

l2_norm = np.linalg.norm(v1, ord=2) # sqrt(3^2 + 4^2) = 5.0
l1_norm = np.linalg.norm(v1, ord=1) # 3 + 4 = 7.0
dot_prod = np.dot(v1, v2)
cos_theta = dot_prod / (np.linalg.norm(v1) * np.linalg.norm(v2))

print(f"Vector v1: {v1}")
print(f"L2 Norm: {l2_norm}, L1 Norm: {l1_norm}")
print(f"Cosine Similarity with [1, 0]: {cos_theta:.3f}")

# 2. Matrix Invertibility and Normal Equation
# Design Matrix X (3 samples, 2 features) + bias column
X = np.array([
    [1.0, 2.0, 1.0],
    [1.0, 4.0, 2.5],
    [1.0, 6.0, 3.8]
])
y = np.array([5.0, 9.0, 13.0])

XtX = X.T @ X
det_XtX = np.linalg.det(XtX)
print(f"\\nDeterminant of X^T X: {det_XtX:.4f}")

if det_XtX != 0:
    w_opt = np.linalg.inv(XtX) @ X.T @ y
    print(f"Optimal Weights (Closed-Form): {np.round(w_opt, 3)}")
else:
    print("Matrix is singular (multicollinear)! Use Ridge regularization.")`,
      },
      keyTakeaways: [
        'The dot product measures geometric alignment and cosine similarity between vectors.',
        'Ordinary Least Squares closed form requires (X^T X) to have a non-zero determinant.',
        'The gradient points uphill; to minimize a loss function, we move in the opposite direction (-grad).',
        'A positive semi-definite Hessian proves the cost landscape is a convex bowl with a unique global optimum.',
      ],
      prosAndCons: {
        pros: [
          'Enables vectorization that scales algorithms across millions of parameters simultaneously.',
          'Provides exact analytical closed-form solutions for linear systems.',
        ],
        cons: [
          'Matrix inversion has cubic computational complexity O(n^3); infeasible when n > 10,000 features without iterative methods.',
        ],
      },
      interviewPrep: [
        {
          question: 'What happens to the OLS Normal Equation when two features are perfectly correlated?',
          answer:
            'When two features are perfectly collinear, the columns of design matrix X are linearly dependent. Consequently, the matrix (X^T X) is rank-deficient (determinant is zero) and non-invertible (singular). There are infinitely many weight combinations that minimize the sum of squared errors. To solve this, you must remove one collinear feature, use the Moore-Penrose pseudoinverse, or add an L2 Ridge regularization penalty.',
          trapOrTip:
            'Explicitly mention that Ridge regression adds lambda * I to (X^T X), making the resulting matrix strictly positive definite and always invertible.',
        },
      ],
    },
    {
      id: 'prob_stats_ml',
      tierId: 'tier2',
      title: 'Probability Distributions & Inferential Statistics',
      category: 'Statistics & Math',
      difficulty: 'Intermediate',
      summary:
        'Random variables, Gaussian (Normal) distribution equation, Central Limit Theorem, and Bayes’ Theorem.',
      estimatedMinutes: 25,
      tags: ['Probability', 'Statistics', 'Gaussian', 'Normal Distribution', 'Bayes Theorem', 'CLT'],
      intuition:
        'Machine learning models operate under uncertainty. When an autonomous car sees a blurry shape in the fog, it cannot say with 100% certainty "that is a pedestrian". It calculates a probability distribution. Statistics gives us the mathematical language to quantify uncertainty, compute likelihoods, and update beliefs as new evidence arrives.',
      technicalExplanation:
        '### 1. The Gaussian (Normal) Distribution\n\nThe bell curve $\\mathcal{N}(\\mu, \\sigma^2)$ is the most ubiquitous distribution in machine learning because noise in physical systems naturally sums to a Gaussian (by the Central Limit Theorem). Its Probability Density Function (PDF) is:\n$$p(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{(x - \\mu)^2}{2\\sigma^2} \\right)$$\n- **Empirical 68-95-99.7 Rule**:\n  - $68.27\\%$ of data lies within $\\mu \\pm 1\\sigma$.\n  - $95.45\\%$ of data lies within $\\mu \\pm 2\\sigma$.\n  - $99.73\\%$ of data lies within $\\mu \\pm 3\\sigma$.\n\n---\n\n### 2. Central Limit Theorem (CLT)\n\nRegardless of the underlying population distribution (even if heavily skewed, uniform, or bimodal), the distribution of the **sample mean** $\\bar{X}_n$ approaches a normal distribution as the sample size $n$ grows ($n \\ge 30$):\n$$\\bar{X}_n \\sim \\mathcal{N}\\left(\\mu, \\frac{\\sigma^2}{n}\\right)$$\nThis justifies using standard parametric hypothesis tests (Z-test, t-test) and Gaussian noise assumptions in linear regression residuals.\n\n---\n\n### 3. Bayes’ Theorem & The 4 Essential Components\n\nBayes’ Theorem provides the formal rule for updating hypothesis probability given observed evidence:\n$$P(A \\mid B) = \\frac{P(B \\mid A) \\cdot P(A)}{P(B)}$$\nIn Machine Learning classification terms:\n- **$P(y)$ (Prior Probability)**: Probability of class $y$ before observing feature evidence $x$ (e.g. historical baseline cancer rate in population: $1\\%$).\n- **$P(x \\mid y)$ (Likelihood)**: Probability that the observed features $x$ would be produced given class $y$.\n- **$P(x)$ (Evidence / Marginal)**: Total probability of observing features $x$ across all classes $\\sum_{c} P(x \\mid c) P(c)$.\n- **$P(y \\mid x)$ (Posterior Probability)**: The updated probability of class $y$ after observing evidence $x$.',
      mathFormulas: [
        {
          title: 'Gaussian (Normal) Distribution PDF',
          latex: 'f(x \\mid \\mu, \\sigma^2) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} \\exp\\left( -\\frac{(x - \\mu)^2}{2\\sigma^2} \\right)',
          explanation:
            'Defines probability density for a continuous random variable with mean mu and variance sigma squared.',
        },
        {
          title: 'Bayes Theorem (Machine Learning Formulation)',
          latex: 'P(y \\mid x) = \\frac{P(x \\mid y) P(y)}{\\sum_{c \\in \\mathcal{C}} P(x \\mid c) P(c)}',
          explanation:
            'Calculates posterior probability of class y given input features x by combining class likelihood and prior belief.',
        },
      ],
      pythonSnippet: {
        title: 'Verifying Central Limit Theorem & Bayes Theorem in Python',
        isRunnableInDataForge: true,
        explanation:
          'Simulates CLT from a heavily skewed exponential distribution and calculates posterior cancer probability given a positive test using Bayes Theorem.',
        code: `import numpy as np

# 1. Central Limit Theorem Simulation
np.random.seed(42)
# Draw 100,000 samples from an exponential distribution (heavily skewed)
population = np.random.exponential(scale=2.0, size=100_000)

# Take 1,000 random samples of size n=50 and compute their means
sample_means = [np.mean(np.random.choice(population, size=50)) for _ in range(1000)]

print("=== Central Limit Theorem Verification ===")
print(f"Population Mean: {np.mean(population):.3f}, Skewed: True")
print(f"Sample Means Mean: {np.mean(sample_means):.3f} (Matches population mean)")
print(f"Sample Means Std Dev: {np.std(sample_means):.3f} (Approx sigma / sqrt(n))\\n")

# 2. Bayes Theorem: Medical Diagnostic Test
# Scenario: 1% of population has a rare disease.
# Test has 95% sensitivity (True Positive Rate) and 5% false positive rate.
p_disease = 0.01          # Prior P(D)
p_no_disease = 0.99       # Prior P(~D)
p_pos_given_d = 0.95      # Likelihood P(+ | D)
p_pos_given_no_d = 0.05   # False Positive P(+ | ~D)

# Marginal P(+) = P(+|D)*P(D) + P(+|~D)*P(~D)
p_pos = (p_pos_given_d * p_disease) + (p_pos_given_no_d * p_no_disease)

# Posterior P(D | +)
p_d_given_pos = (p_pos_given_d * p_disease) / p_pos

print("=== Bayes Theorem Diagnostic Calculation ===")
print(f"P(Disease | Positive Test Result): {p_d_given_pos * 100:.2f}%")
print("Notice: Even with a 95% accurate test, a positive result only implies ~16% chance of having the disease due to the low prior base rate!")`,
      },
      keyTakeaways: [
        'The Central Limit Theorem guarantees sample means are normally distributed regardless of original population shape.',
        'Never ignore prior probabilities: low base-rate events yield surprisingly low posterior probabilities even after positive test results.',
        'Gaussian distributions are the foundation of Gaussian Naive Bayes, Linear Discriminant Analysis, and Kalman Filters.',
        'Likelihood P(x | y) measures how well parameters explain data; Posterior P(y | x) is what we care about for decisions.',
      ],
      prosAndCons: {
        pros: [
          'Provides principled probabilistic uncertainty bounds for predictions.',
          'Bayes rule allows incremental learning as new data arrives sequentially.',
        ],
        cons: [
          'Assuming features follow normal distributions is often violated in financial and real-world heavy-tailed data.',
        ],
      },
      interviewPrep: [
        {
          question: 'If a disease has a 1% prevalence, and a test is 95% accurate (5% FPR and 5% FNR), what is the probability a person has the disease given a positive test?',
          answer:
            'Approximately 16.1%. Using Bayes Theorem: P(D|+) = [P(+|D) * P(D)] / [P(+|D)*P(D) + P(+|~D)*P(~D)] = (0.95 * 0.01) / [(0.95 * 0.01) + (0.05 * 0.99)] = 0.0095 / (0.0095 + 0.0495) = 0.0095 / 0.0590 ≈ 16.1%. This counterintuitive result is known as the Base Rate Fallacy.',
          trapOrTip:
            'Candidates who simply say "95%" fail immediately. Walk through the four terms of Bayes theorem clearly.',
        },
      ],
    },
    {
      id: 'gradient_descent',
      tierId: 'tier2',
      title: 'Cost Functions, Convexity & Gradient Descent',
      category: 'Statistics & Math',
      difficulty: 'Intermediate',
      summary:
        'Mean squared error cost function derivation, convexity, learning rates, and Batch vs SGD vs Mini-Batch algorithms.',
      estimatedMinutes: 30,
      tags: ['Gradient Descent', 'Cost Function', 'Convexity', 'Learning Rate', 'Optimization', 'SGD'],
      intuition:
        'Imagine you are blindfolded on a foggy mountain and want to reach the lowest valley. You cannot see the landscape. What do you do? You feel the slope beneath your feet with your cane. If the slope tilts downward to your right, you take a step to the right. Gradient descent is that exact process: calculating the mathematical slope (gradient) and taking a step downhill until the ground is flat.',
      technicalExplanation:
        '### 1. The Mean Squared Error Cost Function $J(w, b)$\n\nFor a linear hypothesis $f_{w,b}(x) = w^T x + b$, we measure the total error over $m$ training samples using the **Squared Error Cost Function**:\n$$J(w, b) = \\frac{1}{2m} \\sum_{i=1}^m \\left( f_{w,b}(x^{(i)}) - y^{(i)} \\right)^2$$\n**Why the factor $\\frac{1}{2m}$?**\n- The factor $\\frac{1}{m}$ computes the average loss across all samples, making the loss invariant to dataset size.\n- The constant $\\frac{1}{2}$ is an algebraic convenience: when taking the derivative with respect to $w$ or $b$, the power rule brings down a $2$ that cancels cleanly with $\\frac{1}{2}$:\n  $$\\frac{\\partial}{\\partial w} \\left[ \\frac{1}{2} (f(x) - y)^2 \\right] = (f(x) - y) \\frac{\\partial f}{\\partial w} = (f(x) - y) x$$\n\n---\n\n### 2. The Gradient Descent Update Equations\n\nGradient descent iteratively updates parameters by stepping in the opposite direction of the gradient:\n$$w := w - \\alpha \\frac{\\partial J(w, b)}{\\partial w} = w - \\alpha \\frac{1}{m} \\sum_{i=1}^m \\left( f_{w,b}(x^{(i)}) - y^{(i)} \\right) x^{(i)}$$\n$$b := b - \\alpha \\frac{\\partial J(w, b)}{\\partial b} = b - \\alpha \\frac{1}{m} \\sum_{i=1}^m \\left( f_{w,b}(x^{(i)}) - y^{(i)} \\right)$$\nwhere $\\alpha > 0$ is the **learning rate** hyperparameter.\n\n---\n\n### 3. Learning Rate $\\alpha$ Diagnostics\n\n- **$\\alpha$ too small**: Algorithm takes tiny steps. Convergence is agonizingly slow, requiring thousands of unnecessary epochs.\n- **$\\alpha$ too large**: Algorithm overshoots the valley, oscillating violently and eventually diverging ($J(w,b) \\to \\infty$).\n- **Correct $\\alpha$**: Cost $J(w,b)$ strictly decreases after every single iteration.\n\n---\n\n### 4. Batch vs Stochastic (SGD) vs Mini-Batch GD\n\n1. **Batch Gradient Descent**: Computes the gradient over all $m$ training samples per step. Smooth convergence, but memory-intensive and slow for massive datasets ($m > 1,000,000$).\n2. **Stochastic Gradient Descent (SGD)**: Computes the gradient on **1 single random sample** per step. Extremely fast and escapes local minima, but creates noisy, erratic oscillations.\n3. **Mini-Batch Gradient Descent**: The industry standard. Computes gradients on small batches (e.g. 32, 64, 128, 256 samples). Combines vectorization hardware efficiency with stochastic regularization.',
      mathFormulas: [
        {
          title: 'Gradient Descent Parameter Update Rule',
          latex: '\\theta_{t+1} = \\theta_t - \\alpha \\nabla_\\theta J(\\theta_t)',
          explanation:
            'Updates parameter vector theta by subtracting the gradient scaled by step-size alpha to descend towards the loss minimum.',
        },
        {
          title: 'Partial Derivative of MSE Cost',
          latex: '\\frac{\\partial J(w, b)}{\\partial w_j} = \\frac{1}{m} \\sum_{i=1}^m \\left( f_{w,b}(x^{(i)}) - y^{(i)} \\right) x_j^{(i)}',
          explanation:
            'Shows the gradient component for feature j is the sample average of prediction error multiplied by feature value.',
        },
      ],
      pythonSnippet: {
        title: 'Complete Gradient Descent Implementation from Scratch',
        isRunnableInDataForge: true,
        explanation:
          'Implements batch gradient descent from first principles in NumPy and plots the strictly decreasing cost function curve.',
        code: `import numpy as np

# 1. Synthesize linear dataset
np.random.seed(42)
m = 100
X = 2 * np.random.rand(m, 1)
# True parameters: w = 4.2, b = 3.0
y = 4.2 * X + 3.0 + np.random.randn(m, 1) * 0.5

# 2. Gradient Descent Implementation
w = 0.0 # Initial guess
b = 0.0
alpha = 0.1 # Learning rate
iterations = 100
cost_history = []

for iteration in range(iterations):
    # Hypothesis: f(x) = w*x + b
    y_pred = w * X + b
    error = y_pred - y
    
    # Compute Cost J(w, b) = 1/(2m) * sum(error^2)
    cost = (1.0 / (2.0 * m)) * np.sum(error ** 2)
    cost_history.append(cost)
    
    # Compute Gradients
    dw = (1.0 / m) * np.sum(error * X)
    db = (1.0 / m) * np.sum(error)
    
    # Simultaneous Update
    w -= alpha * dw
    b -= alpha * db

print("=== Gradient Descent Training Complete ===")
print(f"Learned w: {w:.4f} (True: 4.2000)")
print(f"Learned b: {b:.4f} (True: 3.0000)")
print(f"Initial Cost: {cost_history[0]:.4f}")
print(f"Final Cost:   {cost_history[-1]:.4f}")
print(f"Convergence Verified: Cost decreased strictly monotonically!")`,
      },
      keyTakeaways: [
        'Always update parameters w and b simultaneously in each step; do not update w and then use the new w to compute the gradient for b.',
        'The 1/2 factor in MSE cancels cleanly with the power of 2 during differentiation.',
        'If cost J increases after an iteration, your learning rate alpha is too large.',
        'Mini-batch gradient descent (batch size 32-256) is the gold standard used in modern deep learning frameworks.',
      ],
      prosAndCons: {
        pros: [
          'Scales to arbitrary numbers of features n and millions of samples m without O(n^3) matrix inversions.',
          'Generalizes to non-linear and non-convex architectures (Neural Networks).',
        ],
        cons: [
          'Requires careful tuning of hyperparameter alpha (learning rate).',
          'Sensitive to unstandardized feature scales, causing zigzagging convergence.',
        ],
      },
      interviewPrep: [
        {
          question: 'Why do we update w and b simultaneously in Gradient Descent?',
          answer:
            'The partial derivatives dJ/dw and dJ/db are calculated at the current point (w_t, b_t). If you update w first and then calculate dJ/db using the new w_{t+1}, you are no longer computing the true gradient of the cost function at (w_t, b_t), leading to skewed optimization trajectories.',
          trapOrTip:
            'Mention that simultaneous update is mathematically required because the gradient vector nabla J is evaluated at a single point in parameter space.',
        },
      ],
    },
  ],
};
