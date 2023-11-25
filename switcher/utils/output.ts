import { MatchRound, MatchTuple } from "vex-tm-client";

export function getMatchName(match: MatchTuple) {
    switch (match.round) {
        case MatchRound.Qualification:
            return `Qualification ${match.instance}`;
        case MatchRound.Practice:
            return `Practice ${match.instance}`;

        case MatchRound.RoundRobin:
            return `Round Robin ${match.instance}`;

        case MatchRound.RoundOf128:
            return `Round Of 128 ${match.instance} - ${match.match}`;

        case MatchRound.RoundOf64:
            return `Round Of 64 ${match.instance} - ${match.match}`;

        case MatchRound.RoundOf32:
            return `Round Of 32 ${match.instance} - ${match.match}`;

        case MatchRound.RoundOf16:
            return `Round Of 16 ${match.instance} - ${match.match}`;

        case MatchRound.Quarterfinal:
            return `Quarterfinal ${match.instance} - ${match.match}`;

        case MatchRound.Semifinal:
            return `Semifinal ${match.instance} - ${match.match}`;

        case MatchRound.Final:
            return `Final ${match.instance} - ${match.match}`;

        case MatchRound.TopN:
            return `Final ${match.instance} - ${match.match}`;

        case MatchRound.Skills:
            return `Skills`;

        default:
            return `${match.round} ${match.instance}`;

    }
};