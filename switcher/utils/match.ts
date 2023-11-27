import { MatchRound, MatchTuple } from "vex-tm-client";

export function getMatchName(match: MatchTuple) {

    if (Object.keys(match).length === 0) return "Timeout";

    switch (match.round) {
        case MatchRound.Qualification:
            return `Q ${match.match}`;
        case MatchRound.Practice:
            return `P ${match.match}`;

        case MatchRound.RoundRobin:
            return `RR ${match.instance}-${match.match}`;

        case MatchRound.RoundOf128:
            return `R128 ${match.instance}-${match.match}`;

        case MatchRound.RoundOf64:
            return `R64 ${match.instance}-${match.match}`;

        case MatchRound.RoundOf32:
            return `R32 ${match.instance}-${match.match}`;

        case MatchRound.RoundOf16:
            return `R16 ${match.instance}-${match.match}`;

        case MatchRound.Quarterfinal:
            return `QF ${match.instance}-${match.match}`;

        case MatchRound.Semifinal:
            return `SF ${match.instance}-${match.match}`;

        case MatchRound.Final:
            return `F ${match.instance}-${match.match}`;

        case MatchRound.TopN:
            return `F ${match.match}`;

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