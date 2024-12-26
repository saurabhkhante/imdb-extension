// Store API key
const OMDB_API_KEY = '9fa27c20';

// Function to create the rating element
function createRatingElement(rating, imdbID) {
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'imdb-rating';
    ratingDiv.innerHTML = `
        <span class="imdb-star">★</span>
        <span>${rating}</span>
    `;
    
    // Make it clickable to open IMDB page
    ratingDiv.addEventListener('click', () => {
        window.open(`https://www.imdb.com/title/${imdbID}`, '_blank');
    });
    
    return ratingDiv;
}

// Function to fetch rating from OMDB API
async function fetchIMDBRating(title) {
    try {
        // Change http to https
        const response = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}`);
        const data = await response.json();
        
        if (data.Response === 'True' && data.imdbRating && data.imdbID) {
            return {
                rating: data.imdbRating,
                imdbID: data.imdbID
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching IMDB rating:', error);
        return null;
    }
}

// Function to extract title from Netflix card
function extractTitleFromCard(card) {
    // Check for title in the href attribute first
    const linkElement = card.querySelector('a[href^="/watch/"]');
    if (linkElement) {
        const ariaLabel = linkElement.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;
    }

    // Check for title in the bobber-content
    const fallbackText = card.querySelector('.fallback-text-container');
    if (fallbackText) {
        return fallbackText.textContent.trim();
    }

    // Try to find title from aria-label first
    const ariaLabel = card.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.split(',')[0];
    
    // Final fallback to finding title from text content
    const titleElement = card.querySelector('[class*="title"]') || 
                        card.querySelector('[class*="label"]') ||
                        card.querySelector('a[href*="/watch/"]');
    
    return titleElement ? titleElement.textContent.trim() : null;
}

// Function to check if an element is a movie/show card
function isMovieCard(element) {
    return (
        element.classList.contains('title-card') || 
        element.classList.contains('slider-refocus') ||  // For carousel items
        element.querySelector('.boxart-container') !== null ||
        element.querySelector('[data-uia="video-card"]') !== null  // For search results
    );
}

// Function to add rating to a card
async function addRatingToCard(card) {
    if (card.querySelector('.imdb-rating')) return;
    
    const title = extractTitleFromCard(card);
    if (!title) return;
    
    const imdbData = await fetchIMDBRating(title);
    if (!imdbData || !imdbData.rating) return;
    
    const ratingElement = createRatingElement(imdbData.rating, imdbData.imdbID);
    
    // Find the most appropriate container for the rating
    const container = card.querySelector('.boxart-container') || 
                     card.querySelector('[data-uia="video-card-container"]') ||
                     card;
                     
    container.style.position = 'relative';
    container.appendChild(ratingElement);
}

// Function to observe and handle new Netflix cards being added
function observeNetflixCards() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Handle carousel slides
            if (mutation.target.classList.contains('sliderMask') || 
                mutation.target.classList.contains('galleryLockups')) {
                const cards = mutation.target.querySelectorAll('.slider-refocus, .title-card');
                cards.forEach(card => addRatingToCard(card));
                return;
            }

            // Handle regular mutations
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (isMovieCard(node)) {
                        addRatingToCard(node);
                    } else {
                        // Search deeper for movie cards
                        node.querySelectorAll('.slider-refocus, .title-card, [data-uia="video-card"]')
                            .forEach(card => addRatingToCard(card));
                    }
                }
            });
        });
    });

    // Observe both document body and potential carousel containers
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial load of visible cards
    document.querySelectorAll('.slider-refocus, .title-card, [data-uia="video-card"]')
        .forEach(card => addRatingToCard(card));
}

// Start observing when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeNetflixCards);
} else {
    observeNetflixCards();
}