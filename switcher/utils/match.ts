import { MatchRound, MatchTuple } from "vex-tm-client";

export function getMatchName(match: MatchTuple) {

    if (Object.keys(match).length === 0) return "Timeout";

    switch (match.round) {
        case MatchRound.Qualification:
            return `Qualification ${match.match}`;
        case MatchRound.Practice:
            return `Practice ${match.match}`;

        case MatchRound.RoundRobin:
            return `Round Robin ${match.instance}`;

        case MatchRound.RoundOf128:
            return `Round of 128 ${match.instance} - ${match.match}`;

        case MatchRound.RoundOf64:
            return `Round of 64 ${match.instance} - ${match.match}`;

        case MatchRound.RoundOf32:
            return `Round of 32 ${match.instance} - ${match.match}`;

        case MatchRound.RoundOf16:
            return `Round of 16 ${match.instance} - ${match.match}`;

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

export function matchesEqual(a: MatchTuple | null, b: MatchTuple | null) {
    if (!a || !b) return false;
    return a.division === b.division && a.round === b.round && a.instance === b.instance && a.match === b.match && a.session === b.session;
}