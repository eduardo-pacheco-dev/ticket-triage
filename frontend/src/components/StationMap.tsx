import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { Link } from 'react-router-dom';
import { fetchStationsMap } from '../lib/api';
import type { StationMapPoint } from '../lib/types';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/dist/styles.min.css';

function parseCoord(v: string): number {
  const cleaned = v.replace(',', '.').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function FitBounds({ points }: { points: StationMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const latlngs: Array<[number, number]> = points
      .map((p) => [parseCoord(p.latitude), parseCoord(p.longitude)] as [number, number])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (latlngs.length === 0) return;
    if (latlngs.length === 1) {
      map.setView(latlngs[0], 13);
    } else {
      map.fitBounds(latlngs, { padding: [40, 40] });
    }
  }, [map, points]);

  return null;
}

interface StationMapProps {
  stateFilter?: string;
}

export default function StationMap({ stateFilter }: StationMapProps) {
  const [points, setPoints] = useState<StationMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchStationsMap(stateFilter)
      .then(setPoints)
      .catch(() => setError('Erro ao carregar pontos no mapa.'))
      .finally(() => setLoading(false));
  }, [stateFilter]);

  const validPoints = useMemo(
    () =>
      points.filter((p) => {
        const lat = parseCoord(p.latitude);
        const lng = parseCoord(p.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng);
      }),
    [points],
  );

  const center = useMemo((): [number, number] => {
    if (validPoints.length === 0) return [-14.235, -51.925];
    const lat = parseCoord(validPoints[0].latitude);
    const lng = parseCoord(validPoints[0].longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : [-14.235, -51.925];
  }, [validPoints]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 400, alignItems: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 400, alignItems: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (validPoints.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 400, alignItems: 'center' }}>
        <Typography color="text.secondary">
          Nenhuma estação com coordenadas válidas encontrada.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: 'calc(100vh - 280px)',
        minHeight: 400,
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <MapContainer
        center={center}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={validPoints} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {validPoints.map((p) => {
            const lat = parseCoord(p.latitude);
            const lng = parseCoord(p.longitude);
            return (
              <Marker key={p.id} position={[lat, lng]}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <Link
                      to={`/admin/estacoes/${p.id}`}
                      style={{ fontWeight: 600, textDecoration: 'none', color: '#1976d2' }}
                    >
                      {p.name}
                    </Link>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 2 }}>
                      <span style={{ fontFamily: 'monospace' }}>{p.code}</span>
                    </div>
                    {(p.city || p.state) && (
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 2 }}>
                        {[p.city, p.state].filter(Boolean).join(' - ')}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </Box>
  );
}
