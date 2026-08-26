import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { Link } from 'react-router-dom';
import { fetchStationsMap } from '../lib/api';
import type { StationMapPoint } from '../lib/types';
import 'leaflet/dist/leaflet.css';
// @ts-expect-error no type declarations for CSS
import 'react-leaflet-markercluster/styles';

const BRAZIL_BOUNDS = { south: -34.0, north: 5.0, west: -74.0, east: -34.0 };

function parseCoord(v: string): number {
  const cleaned = v.replace(',', '.').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function useParsedCoords(points: StationMapPoint[]) {
  return useMemo(() => {
    const map = new Map<StationMapPoint, [number, number]>();
    for (const p of points) {
      const lat = parseCoord(p.latitude);
      const lng = parseCoord(p.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        map.set(p, [lat, lng]);
      }
    }
    return map;
  }, [points]);
}

function FitBounds({ coords }: { coords: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 13);
    } else {
      map.fitBounds(coords, { padding: [40, 40] });
    }
  }, [map, coords]);
  return null;
}

function ViewportFetcher({
  onBounds,
  debounceRef,
}: {
  onBounds: (b: { south: number; north: number; west: number; east: number }) => void;
  debounceRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}) {
  const map = useMap();
  useMapEvents({
    moveend() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        onBounds({
          south: b.getSouth(),
          north: b.getNorth(),
          west: b.getWest(),
          east: b.getEast(),
        });
      }, 300);
    },
  });
  return null;
}

interface StationMapProps {
  stateFilter?: string;
  searchTerm?: string;
}

export default function StationMap({ stateFilter, searchTerm }: StationMapProps) {
  const [points, setPoints] = useState<StationMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoadRef = useRef(true);

  const parsedCoords = useParsedCoords(points);
  const coords = useMemo(() => Array.from(parsedCoords.values()), [parsedCoords]);

  const handleBounds = useCallback(
    async (bounds: { south: number; north: number; west: number; east: number }) => {
      try {
        if (!isFirstLoadRef.current) setLoadingMore(true);
        const data = await fetchStationsMap(stateFilter, bounds, searchTerm);
        setPoints(data);
      } catch {
        setPoints([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isFirstLoadRef.current = false;
      }
    },
    [stateFilter, searchTerm],
  );

  useEffect(() => {
    isFirstLoadRef.current = true;
    setLoading(true);
    void handleBounds(BRAZIL_BOUNDS);
  }, [stateFilter, searchTerm, handleBounds]);

  const center = useMemo((): [number, number] => {
    if (coords.length === 0) return [-14.235, -51.925];
    return coords[0];
  }, [coords]);

  return (
    <Box
      sx={{
        height: 'calc(100vh - 280px)',
        minHeight: 400,
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1000,
            bgcolor: 'background.paper',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}

      {!loading && points.length === 0 && !loadingMore ? (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', minHeight: 400, alignItems: 'center' }}
        >
          <Typography color="text.secondary">
            Nenhuma estação com coordenadas válidas nesta área.
          </Typography>
        </Box>
      ) : (
        <>
          {loadingMore && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1000,
                bgcolor: 'background.paper',
                borderRadius: 1,
                px: 1.5,
                py: 0.5,
                boxShadow: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CircularProgress size={14} />
              <Typography variant="caption">Carregando...</Typography>
            </Box>
          )}
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
            <ViewportFetcher onBounds={handleBounds} debounceRef={debounceRef} />
            <FitBounds coords={coords} />
            <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
              {Array.from(parsedCoords.entries()).map(([point, [lat, lng]]) => (
                <Marker key={point.id} position={[lat, lng]}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <Link
                        to={`/admin/estacoes/${point.id}`}
                        style={{ fontWeight: 600, textDecoration: 'none', color: '#1976d2' }}
                      >
                        {point.name}
                      </Link>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 2 }}>
                        <span style={{ fontFamily: 'monospace' }}>{point.code}</span>
                      </div>
                      {(point.city || point.state) && (
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 2 }}>
                          {[point.city, point.state].filter(Boolean).join(' - ')}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </>
      )}
    </Box>
  );
}
