import { MlTier } from '@/types/ml';

export const tier6Data: MlTier = {
  id: 'tier6',
  tierNumber: 6,
  title: 'Unsupervised Learning & Dimensionality Reduction',
  subtitle: 'K-Means, DBSCAN, Hierarchical Clustering, PCA & t-SNE Manifold Learning',
  badge: 'Unsupervised Mastery',
  difficulty: 'Advanced',
  accentColor: '#06b6d4', // Cyan
  description:
    'Discover hidden structures in unannotated data. Master partitioning algorithms (K-Means++), density-based clustering (DBSCAN), hierarchical agglomerative trees, and linear versus non-linear dimensionality reduction via Principal Component Analysis (PCA) and t-SNE.',
  concepts: [
    {
      id: 'kmeans_clustering',
      tierId: 'tier6',
      title: 'Introduction to Unsupervised Learning & K-Means Clustering',
      category: 'Unsupervised Learning',
      difficulty: 'Intermediate',
      summary:
        'Definition of Unsupervised Learning, K-Means clustering algorithm, WCSS / Inertia objective function, Elbow Method, and Silhouette Analysis.',
      estimatedMinutes: 30,
      tags: ['Unsupervised Learning', 'K-Means', 'Clustering', 'Inertia', 'Elbow Method', 'Silhouette'],
      intuition:
        'Imagine you are an archaeologist who discovers thousands of ancient clay pottery fragments with no labels, dates, or signatures. How do you make sense of them? You group them based on their similarities — size, thickness, color, and clay texture. Unsupervised learning is that exact process: finding natural tribes and patterns in unlabeled data.',
      technicalExplanation:
        '### 1. The Unsupervised Learning Paradigm\n\nIn Unsupervised Learning, the dataset contains **only feature vectors without target labels**:\n$$\\mathcal{D} = \\left\\{ x^{(1)}, x^{(2)}, \\dots, x^{(m)} \\right\\}, \\quad x^{(i)} \\in \\mathbb{R}^n$$\nThere is no supervisor or teacher providing correct answers. The goal is to discover latent probability distributions, topological manifolds, or natural partitions.\n\n---\n\n### 2. The K-Means Clustering Algorithm\n\nK-Means partitions $m$ observations into $K$ distinct, non-overlapping clusters $S = \\{S_1, S_2, \\dots, S_K\\}$ to minimize the **Within-Cluster Sum of Squares (WCSS / Inertia)**:\n$$J = \\sum_{k=1}^K \\sum_{x^{(i)} \\in S_k} \\left\\| x^{(i)} - \\mu_k \\right\\|^2$$\nwhere $\\mu_k = \\frac{1}{|S_k|} \\sum_{x \\in S_k} x$ is the mean centroid of cluster $k$.\n\n**The Lloyd-Forgy Algorithm (Expectation-Maximization)**:\n1. **Initialization**: Select $K$ initial centroid locations using **K-Means++** (which spaces centroids far apart proportionally to squared distance, preventing poor local minima).\n2. **Assignment Step (E-step)**: Assign each data point $x^{(i)}$ to its closest centroid:\n   $$c^{(i)} = \\arg\\min_{k} \\left\\| x^{(i)} - \\mu_k \\right\\|^2$$\n3. **Update Step (M-step)**: Recompute centroid $\\mu_k$ as the arithmetic mean of all points assigned to cluster $k$.\n4. **Repeat** steps 2 and 3 until centroids stabilize (convergence).\n\n---\n\n### 3. Choosing Optimal $K$: The Diagnostic Toolkit\n\n- **The Elbow Method**: Plot WCSS (Inertia) against candidate values of $K$. As $K$ increases, WCSS strictly decreases. Look for the "elbow point" where the rate of decrease abruptly flattens.\n- **The Silhouette Coefficient ($s \\in [-1, +1]$)**:\n  For each point $i$, let $a(i)$ be mean intra-cluster distance and $b(i)$ be mean nearest-cluster distance:\n  $$s(i) = \\frac{b(i) - a(i)}{\\max(a(i), b(i))}$$\n  - $s \\approx +1$: Point is well-clustered inside its cluster and far from neighboring clusters.\n  - $s \\approx 0$: Point lies on the border between two clusters.\n  - $s < 0$: Point has been assigned to the wrong cluster.',
      mathFormulas: [
        {
          title: 'K-Means WCSS Objective (Inertia)',
          latex: 'J(c, \\mu) = \\sum_{i=1}^m \\left\\| x^{(i)} - \\mu_{c^{(i)}} \\right\\|^2',
          explanation:
            'Sum of squared Euclidean distances between every point and its assigned cluster centroid.',
        },
        {
          title: 'Silhouette Coefficient',
          latex: 's(i) = \\frac{b(i) - a(i)}{\\max\\left(a(i), b(i)\\right)} \\in [-1, +1]',
          explanation:
            'Measures both cluster cohesion (a) and cluster separation from nearest neighbor (b).',
        },
      ],
      pythonSnippet: {
        title: 'K-Means++ Clustering & Silhouette Evaluation in Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'Demonstrates clustering unlabeled points with KMeans(init="k-means++") and computing the Silhouette score.',
        code: `import numpy as np
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# 1. Generate 3 synthetic clusters
X, _ = make_blobs(n_samples=300, centers=3, cluster_std=0.7, random_state=42)

# 2. Fit K-Means with K-Means++ initialization
kmeans = KMeans(n_clusters=3, init='k-means++', n_init=10, random_state=42)
cluster_labels = kmeans.fit_predict(X)

# 3. Compute Metrics
wcss = kmeans.inertia_
sil_score = silhouette_score(X, cluster_labels)

print("=== K-Means Clustering Results ===")
print(f"Total Inertia (WCSS): {wcss:.2f}")
print(f"Silhouette Score:    {sil_score:.3f} (Values > 0.5 indicate strong cluster cohesion)")
print("Centroid Coordinates:\\n", np.round(kmeans.cluster_centers_, 2))`,
      },
      keyTakeaways: [
        'K-Means partitions data into K spherical, equally-sized clusters by minimizing within-cluster variance.',
        'Always use K-Means++ initialization to prevent convergence to suboptimal local minima.',
        'Feature scaling is mandatory because K-Means computes Euclidean distances.',
        'Use Silhouette analysis alongside the Elbow method to rigorously pick optimal K.',
      ],
      prosAndCons: {
        pros: [
          'Extremely fast and computationally scalable: O(m * K * n * iterations).',
          'Easy to interpret and assign new unseen query points to learned centroids.',
        ],
        cons: [
          'Assumes spherical, convex clusters of similar size and density; fails completely on moons, rings, or arbitrary shapes.',
          'Requires pre-specifying hyperparameter K.',
        ],
      },
      interviewPrep: [
        {
          question: 'What are the primary limitations of K-Means clustering, and what does K-Means++ solve?',
          answer:
            'K-Means assumes clusters are spherical, convex, and of similar size and density, failing on arbitrary shapes like concentric rings or varying densities. It is also sensitive to outliers that pull centroids. Standard K-Means with random initialization is prone to getting stuck in poor local minima. K-Means++ solves this by initializing centroids sequentially: the first centroid is chosen uniformly at random, and each subsequent centroid is sampled with probability proportional to its squared distance D(x)^2 from the nearest existing centroid, spreading them out optimally.',
          trapOrTip:
            'Point out that n_init in Scikit-Learn defaults to 10 or auto, running K-Means multiple times and picking the run with lowest inertia.',
        },
      ],
    },
    {
      id: 'dbscan_hierarchical',
      tierId: 'tier6',
      title: 'Density-Based (DBSCAN) & Hierarchical Clustering',
      category: 'Unsupervised Learning',
      difficulty: 'Advanced',
      summary:
        'DBSCAN epsilon neighborhoods, core vs border vs noise points, handling arbitrary cluster geometries, and Hierarchical Agglomerative dendrograms.',
      estimatedMinutes: 30,
      tags: ['DBSCAN', 'Hierarchical Clustering', 'Dendrogram', 'Density Based', 'Outlier Detection'],
      intuition:
        'Think of islands in an ocean. A density-based algorithm says: "Any land where people live packed closely together is a village; the empty ocean in between is noise." It does not care if the island is shaped like a crescent moon, a long snaking river, or an S-curve. Unlike K-Means, DBSCAN does not force data into artificial circles and automatically throws away noise.',
      technicalExplanation:
        '### 1. DBSCAN: Density-Based Spatial Clustering of Applications with Noise\n\nDBSCAN requires two hyperparameters:\n- **$\\varepsilon$ (eps)**: Radius of the neighborhood surrounding a point.\n- **`min_samples`**: Minimum number of points required inside radius $\\varepsilon$ to form a dense region.\n\n**Point Taxonomy**:\n1. **Core Point**: Point with $\\ge \\text{min\\_samples}$ within its $\\varepsilon$-neighborhood.\n2. **Border Point**: Point with $< \\text{min\\_samples}$ within $\\varepsilon$, but located within the $\\varepsilon$-neighborhood of a Core Point.\n3. **Noise Point (Outlier)**: Any point that is neither a Core nor a Border point. Assigned label `-1` in Scikit-Learn.\n\n**Key Advantages**:\n- Automatically discovers the number of clusters (no $K$ required).\n- Discovers arbitrary non-linear cluster shapes (e.g. concentric circles, smiley faces).\n- Native outlier and noise detection.\n\n---\n\n### 2. Hierarchical Agglomerative Clustering\n\nBuilds a bottom-up tree of clusters (Dendrogram):\n1. Start with each point as its own solitary cluster.\n2. Merge the two closest clusters based on a **Linkage Criterion**:\n   - **Ward**: Minimizes total within-cluster variance (most balanced, default).\n   - **Complete (Maximum)**: Distance between the two farthest points in clusters.\n   - **Single (Minimum)**: Distance between the two closest points (vulnerable to chaining effects).\n   - **Average**: Mean distance between all pairs of points across clusters.\n3. Repeat until a single master cluster remains. Slice horizontally across the dendrogram at height $h$ to extract desired clusters.',
      mathFormulas: [
        {
          title: 'DBSCAN Epsilon-Neighborhood',
          latex: 'N_\\varepsilon(p) = \\left\\{ q \\in \\mathcal{D} \\mid \\text{dist}(p, q) \\le \\varepsilon \\right\\}, \\quad |N_\\varepsilon(p)| \\ge \\text{min\\_samples} \\implies p \\text{ is Core}',
          explanation:
            'Point p is mathematically defined as a core point if its closed epsilon-ball contains at least min_samples points.',
        },
      ],
      pythonSnippet: {
        title: 'Comparing DBSCAN vs K-Means on Non-Convex Moon Data',
        isRunnableInDataForge: true,
        explanation:
          'Proves why DBSCAN perfectly separates interlocking non-linear crescent moons while K-Means completely fails.',
        code: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler

# 1. Generate interlocking crescent moons with noise
X, _ = make_moons(n_samples=300, noise=0.08, random_state=42)
X_scaled = StandardScaler().fit_transform(X)

# 2. Fit K-Means (K=2)
kmeans = KMeans(n_clusters=2, random_state=42).fit(X_scaled)

# 3. Fit DBSCAN (eps=0.3, min_samples=5)
dbscan = DBSCAN(eps=0.3, min_samples=5).fit(X_scaled)
labels_dbscan = dbscan.labels_

n_clusters_found = len(set(labels_dbscan)) - (1 if -1 in labels_dbscan else 0)
n_noise_points = list(labels_dbscan).count(-1)

print("=== Clustering Benchmark: Non-Convex Moons ===")
print("K-Means:   Forced data into artificial half-moons across a straight line.")
print(f"DBSCAN:    Discovered {n_clusters_found} natural clusters automatically!")
print(f"DBSCAN:    Identified {n_noise_points} true noise/outlier points (labeled -1).")`,
      },
      keyTakeaways: [
        'DBSCAN does not require specifying the number of clusters in advance.',
        'DBSCAN identifies complex non-linear cluster geometries and automatically isolates outliers.',
        'Hierarchical clustering produces an interpretable dendrogram tree for multi-level taxonomies.',
        'DBSCAN struggles when clusters have drastically differing densities (use HDBSCAN instead).',
      ],
      prosAndCons: {
        pros: [
          'Robust to outliers and noise.',
          'No spherical assumption; identifies arbitrarily shaped manifolds.',
        ],
        cons: [
          'Sensitive to hyperparameter epsilon (a tiny shift can merge clusters or turn everything into noise).',
          'O(m^2) distance computation without spatial indexing trees.',
        ],
      },
      interviewPrep: [
        {
          question: 'When should you choose DBSCAN over K-Means?',
          answer:
            'Choose DBSCAN when clusters are non-spherical, have arbitrary geometries (like concentric rings, manifolds, or rivers), when the number of clusters is unknown in advance, or when the dataset contains substantial noise and outliers that must be filtered out. K-Means should be preferred when data is evenly distributed in spherical convex blobs and fast scalability to massive datasets is required.',
          trapOrTip:
            'Mention that DBSCAN fails if clusters have varying densities because a single epsilon cannot fit both dense and sparse clusters.',
        },
      ],
    },
    {
      id: 'pca_dimensionality_reduction',
      tierId: 'tier6',
      title: 'Dimensionality Reduction: PCA & t-SNE',
      category: 'Unsupervised Learning',
      difficulty: 'Advanced',
      summary:
        'The Curse of Dimensionality, Principal Component Analysis (PCA covariance & SVD), Scree plot, and t-SNE non-linear manifold projection.',
      estimatedMinutes: 30,
      tags: ['PCA', 't-SNE', 'Dimensionality Reduction', 'Eigenvalues', 'SVD', 'Manifold Learning'],
      intuition:
        'Imagine holding a complex 3D wooden sculpture in your hands and shining a flashlight to cast its shadow on a flat 2D wall. If you turn the sculpture to just the right angle, the shadow captures almost every important detail and outline of the sculpture. Dimensionality reduction is that exact flashlight: projecting 1,000-dimensional data down to 2 or 3 dimensions while preserving maximum information.',
      technicalExplanation:
        '### 1. The Curse of Dimensionality\n\nAs dimensionality $n$ grows, volume expands exponentially. In high dimensions:\n- Data points become extremely sparse; almost all points sit on the outer shell of the hypersphere.\n- Distance metrics collapse: the distance between the closest pair of points approaches the distance between the farthest pair, rendering nearest-neighbor models useless.\n- Risk of overfitting explodes.\n\n---\n\n### 2. Principal Component Analysis (PCA)\n\nPCA is an **orthogonal linear transformation** that projects data onto a new coordinate system such that the greatest variance by some scalar projection lies on the first coordinate (the first principal component, $\\text{PC}_1$), the second greatest variance on the second, and so on.\n\n**Mathematical Derivation via Covariance Matrix**:\n1. **Mean Center Feature Matrix**: $X_{\\text{centered}} = X - \\mu$.\n2. **Compute Covariance Matrix**: $\\Sigma = \\frac{1}{m} X_{\\text{centered}}^T X_{\\text{centered}} \\in \\mathbb{R}^{n \\times n}$.\n3. **Eigen-Decomposition**: Solve $\\Sigma v_k = \\lambda_k v_k$:\n   - Eigenvalues $\\lambda_1 \\ge \\lambda_2 \\ge \\dots \\ge \\lambda_n$ represent the amount of variance explained along each axis.\n   - Eigenvectors $v_k$ are the orthogonal directions of the principal components.\n4. **Singular Value Decomposition (SVD)**:\n   In practice, Scikit-Learn computes PCA directly via SVD on $X$ ($X = U \\Sigma V^T$) without explicitly building the $O(n^2)$ covariance matrix.\n\n---\n\n### 3. Explained Variance Ratio & The Scree Plot\n\nThe proportion of total dataset variance retained by the top $k$ components is:\n$$\\text{Explained Variance Ratio} = \\frac{\\sum_{j=1}^k \\lambda_j}{\\sum_{i=1}^n \\lambda_i}$$\nWe pick $k$ such that the cumulative explained variance reaches a target threshold (typically $90\\%$ or $95\\%$).\n\n---\n\n### 4. t-SNE (t-Distributed Stochastic Neighbor Embedding)\n\nWhile PCA is **linear**, **t-SNE** is a **non-linear probabilistic manifold learning algorithm** designed exclusively for **data visualization (2D/3D)**:\n- Models pairwise similarities between high-dimensional points using a Gaussian distribution.\n- Models similarities in the low-dimensional embedding using a **Student-t distribution** (with 1 degree of freedom / Cauchy distribution). The heavy tails of the Student-t distribution solve the "Crowding Problem", keeping distinct clusters separated without collapsing into the center.',
      mathFormulas: [
        {
          title: 'PCA Projection Equation',
          latex: 'Z = X_{\\text{centered}} V_k \\quad \\text{where } V_k = [v_1, v_2, \\dots, v_k] \\in \\mathbb{R}^{n \\times k}',
          explanation:
            'Projects centered feature matrix X of rank n down to low-dimensional matrix Z of rank k using top k eigenvectors.',
        },
        {
          title: 'Cumulative Explained Variance Ratio',
          latex: '\\text{EVR}_k = \\frac{\\sum_{j=1}^k \\lambda_j}{\\sum_{i=1}^n \\lambda_i} \\ge 0.95',
          explanation:
            'Determines the minimum number of principal components k required to preserve 95% of total dataset information.',
        },
      ],
      pythonSnippet: {
        title: 'Principal Component Analysis (PCA) & Variance Plot in Scikit-Learn',
        isRunnableInDataForge: true,
        explanation:
          'Compresses 4-dimensional Iris data to 2 principal components while preserving 95%+ total variance.',
        code: `import numpy as np
from sklearn.datasets import load_iris
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

# 1. Load 4D dataset
iris = load_iris()
X, y = iris.data, iris.target

# 2. Standardize features (PCA requires zero mean and unit variance!)
X_scaled = StandardScaler().fit_transform(X)

# 3. Fit PCA retaining 2 principal components
pca = PCA(n_components=2)
X_pca = pca.fit_transform(X_scaled)

# 4. Analyze Explained Variance
var_ratio = pca.explained_variance_ratio_
total_var = np.sum(var_ratio)

print("=== Principal Component Analysis (PCA) ===")
print(f"PC1 Variance Explained: {var_ratio[0]*100:.1f}%")
print(f"PC2 Variance Explained: {var_ratio[1]*100:.1f}%")
print(f"Total Preserved Variance in 2D: {total_var*100:.1f}%")
print(f"Original Shape: {X.shape} -> Reduced Shape: {X_pca.shape}")`,
      },
      keyTakeaways: [
        'Always standardize features before PCA: unscaled features with huge numbers will artificially dominate principal axes.',
        'PCA is an unsupervised linear transformation maximizing retained variance.',
        'Check the cumulative explained variance ratio to choose the optimal number of components.',
        'Use PCA for feature compression and preprocessing; use t-SNE or UMAP for non-linear 2D/3D visualization.',
      ],
      prosAndCons: {
        pros: [
          'Drastically accelerates training of downstream models by eliminating redundant collinear dimensions.',
          'Eliminates multicollinearity because all principal components are strictly orthogonal.',
        ],
        cons: [
          'Loss of feature interpretability: principal components are linear combinations of all original features.',
          'PCA cannot capture complex non-linear manifolds (e.g. swiss rolls).',
        ],
      },
      interviewPrep: [
        {
          question: 'Why must features be standardized before applying PCA?',
          answer:
            'PCA finds orthogonal directions that maximize variance. Variance is calculated in the raw units of the feature. If one feature is measured in thousands (e.g. salary) and another in single digits (e.g. age), the feature with the large numeric scale will have an enormous numerical variance that dominates the covariance matrix. The first principal component will simply align with that single unscaled feature rather than finding true shared variance.',
          trapOrTip:
            'State that centering (mean = 0) is mathematically required, and scaling (variance = 1) is required whenever features have different units.',
        },
      ],
    },
  ],
};
