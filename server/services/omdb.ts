// Mock OMDB API service with sample movie data
const SAMPLE_MOVIES: Record<string, any> = {
  default: {
    Plot: "A fascinating story about adventure and discovery.",
    Year: "2023",
    imdbRating: "7.5",
    Director: "John Smith",
    Actors: "Jane Doe, John Smith, Mary Johnson",
    Genre: "Drama, Adventure",
    Poster: "https://via.placeholder.com/300x450",
  },
  "inception": {
    Plot: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    Year: "2010",
    imdbRating: "8.8",
    Director: "Christopher Nolan",
    Actors: "Leonardo DiCaprio, Joseph Gordon-Levitt, Ellen Page",
    Genre: "Action, Adventure, Sci-Fi",
    Poster: "https://via.placeholder.com/300x450",
  },
  "matrix": {
    Plot: "A computer programmer discovers that reality as he knows it is a simulation created by machines, and joins a rebellion to break free.",
    Year: "1999",
    imdbRating: "8.7",
    Director: "Lana Wachowski, Lilly Wachowski",
    Actors: "Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss",
    Genre: "Action, Sci-Fi",
    Poster: "https://via.placeholder.com/300x450",
  },
};

export async function getMovieMetadata(title: string): Promise<{
  plot: string;
  year: string;
  rating: string;
  director: string;
  actors: string;
  genre: string;
  poster: string;
}> {
  // Clean up the title by removing file extension and special characters
  const cleanTitle = title.toLowerCase()
    .replace(/\.[^/.]+$/, "") // Remove file extension
    .replace(/[^a-z0-9]/g, " ") // Replace special chars with space
    .trim();

  // Look for exact matches first
  let movieData = SAMPLE_MOVIES[cleanTitle];

  // If no exact match, use default data
  if (!movieData) {
    movieData = SAMPLE_MOVIES.default;
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    plot: movieData.Plot,
    year: movieData.Year,
    rating: movieData.imdbRating,
    director: movieData.Director,
    actors: movieData.Actors,
    genre: movieData.Genre,
    poster: movieData.Poster,
  };
}
