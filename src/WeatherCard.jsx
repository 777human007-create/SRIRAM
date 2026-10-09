import { useEffect, useState } from 'react'
import { CloudSun, LoaderCircle, MapPin, Search, Wind } from 'lucide-react'
import './WeatherCard.css'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

async function fetchCurrentWeather(city, signal) {
  const geocodingParams = new URLSearchParams({
    name: city,
    count: '1',
    language: 'en',
    format: 'json',
  })
  const geocodingResponse = await fetch(`${GEOCODING_URL}?${geocodingParams}`, { signal })
  if (!geocodingResponse.ok) throw new Error('Could not search for that city. Please try again.')

  const geocodingData = await geocodingResponse.json()
  const location = geocodingData.results?.[0]
  if (!location) throw new Error(`We couldn't find “${city}”. Check the spelling and try another city.`)

  const forecastParams = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current_weather: 'true',
    timezone: 'auto',
  })
  const forecastResponse = await fetch(`${FORECAST_URL}?${forecastParams}`, { signal })
  if (!forecastResponse.ok) throw new Error('The weather service is unavailable right now. Please try again.')

  const forecastData = await forecastResponse.json()
  if (!forecastData.current_weather) throw new Error('Current weather is not available for this location.')

  return {
    city: location.name,
    region: [location.admin1, location.country].filter(Boolean).join(', '),
    temperature: forecastData.current_weather.temperature,
    windSpeed: forecastData.current_weather.windspeed,
    windUnit: forecastData.current_weather_units?.windspeed ?? 'km/h',
    temperatureUnit: forecastData.current_weather_units?.temperature ?? '°C',
  }
}

function WeatherSkeleton() {
  return (
    <div className="weather-skeleton" aria-label="Loading current weather" role="status">
      <span className="weather-skeleton-line skeleton-location" />
      <div className="weather-skeleton-main">
        <span className="weather-skeleton-temp" />
        <span className="weather-skeleton-line skeleton-description" />
      </div>
      <span className="weather-skeleton-line skeleton-wind" />
    </div>
  )
}

export default function WeatherCard() {
  const [cityInput, setCityInput] = useState('')
  const [requestedCity, setRequestedCity] = useState('')
  const [requestNumber, setRequestNumber] = useState(0)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!requestedCity) return undefined

    const controller = new AbortController()

    fetchCurrentWeather(requestedCity, controller.signal)
      .then((result) => setWeather(result))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setWeather(null)
          setError(requestError.message || 'Something went wrong while loading the weather.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [requestedCity, requestNumber])

  function searchCity(event) {
    event.preventDefault()
    const city = cityInput.trim()
    if (!city) return
    setWeather(null)
    setError('')
    setLoading(true)
    setRequestedCity(city)
    setRequestNumber((number) => number + 1)
  }

  function retry() {
    setWeather(null)
    setError('')
    setLoading(true)
    setRequestNumber((number) => number + 1)
  }

  return (
    <section className="weather-card glass-card" aria-labelledby="weather-heading">
      <div className="weather-card-heading">
        <div className="weather-heading-icon"><CloudSun size={17} /></div>
        <div>
          <p className="weather-eyebrow">OUTSIDE RIGHT NOW</p>
          <h2 id="weather-heading">Local weather</h2>
        </div>
      </div>

      <form className="weather-search" onSubmit={searchCity}>
        <label className="sr-only" htmlFor="weather-city">Search for a city</label>
        <Search size={16} aria-hidden="true" />
        <input
          id="weather-city"
          type="search"
          value={cityInput}
          onChange={(event) => setCityInput(event.target.value)}
          placeholder="Search a city..."
          autoComplete="off"
          required
        />
        <button type="submit" disabled={!cityInput.trim() || loading} aria-label="Search weather">
          {loading ? <LoaderCircle className="weather-spinner" size={15} /> : <Search size={15} />}
        </button>
      </form>

      {loading ? (
        <WeatherSkeleton />
      ) : error ? (
        <div className="weather-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retry}>Retry</button>
        </div>
      ) : weather ? (
        <div className="weather-result" aria-live="polite">
          <div className="weather-location"><MapPin size={14} /><span>{weather.city}</span>{weather.region && <small>{weather.region}</small>}</div>
          <div className="weather-current">
            <CloudSun className="weather-condition-icon" size={31} strokeWidth={1.7} />
            <strong>{Math.round(weather.temperature)}<span>{weather.temperatureUnit}</span></strong>
          </div>
          <div className="weather-wind"><Wind size={15} /><span>Wind</span><strong>{weather.windSpeed} {weather.windUnit}</strong></div>
        </div>
      ) : (
        <div className="weather-empty">
          <div className="weather-empty-icon"><MapPin size={19} /></div>
          <p>Pick a city to see its current weather.</p>
        </div>
      )}
    </section>
  )
}
