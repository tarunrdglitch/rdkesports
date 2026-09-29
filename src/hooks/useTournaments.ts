import { useQuery } from '@tanstack/react-query'
import { tournamentService } from '@/services/api/tournamentService'
export const useTournaments=()=>useQuery({queryKey:['tournaments'],queryFn:tournamentService.list})
